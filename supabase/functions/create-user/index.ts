import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// Validation schema for create user request
const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(100),
  full_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  profile_pic_url: z.string().url().max(500).optional(),
  role: z.enum(['admin', 'hr', 'employee'])
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is admin or HR
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user has admin or hr role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['admin', 'hr'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only admins and HR can create users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate request body
    const body = await req.json()
    const validationResult = createUserSchema.safeParse(body)
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { email, password, full_name, phone, date_of_birth, profile_pic_url, role } = validationResult.data

    // Create auth user with all profile data in user_metadata
    // The trigger will automatically create the profile from this metadata
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name,
        phone,
        date_of_birth,
        profile_pic_url
      }
    })

    if (createError) throw createError
    if (!newUser.user) throw new Error('User creation failed')

    // Get role_id
    const { data: roleInfo, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role)
      .single()

    if (roleError || !roleInfo) throw roleError || new Error('Role not found')

    // Assign role
    const { error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role_id: roleInfo.id,
        role: role
      })

    if (userRoleError) throw userRoleError

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
