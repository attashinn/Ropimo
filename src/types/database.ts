export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      application_stage_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_stage: string | null
          id: string
          reason: string | null
          to_stage: string
          workspace_id: string
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          reason?: string | null
          to_stage: string
          workspace_id: string
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          reason?: string | null
          to_stage?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_stage_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_stage_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          status: string
          total_minutes: number
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string
          total_minutes?: number
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string
          total_minutes?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          created_at: string
          grace_period_minutes: number
          half_day_threshold_minutes: number
          id: string
          updated_at: string
          work_days: number[]
          work_end_time: string
          work_start_time: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          grace_period_minutes?: number
          half_day_threshold_minutes?: number
          id?: string
          updated_at?: string
          work_days?: number[]
          work_end_time?: string
          work_start_time?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          grace_period_minutes?: number
          half_day_threshold_minutes?: number
          id?: string
          updated_at?: string
          work_days?: number[]
          work_end_time?: string
          work_start_time?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_attachments: {
        Row: {
          created_at: string
          event_id: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_attachments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_comments: {
        Row: {
          author_avatar: string | null
          author_name: string
          content: string
          created_at: string
          event_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_name: string
          content: string
          created_at?: string
          event_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_name?: string
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_type: string
          id: string
          is_all_day: boolean | null
          location: string | null
          meeting_link: string | null
          project_id: string | null
          start_date: string
          start_time: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          meeting_link?: string | null
          project_id?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          meeting_link?: string | null
          project_id?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_activities: {
        Row: {
          action_type: string
          actor_id: string | null
          application_id: string | null
          candidate_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          title: string
          workspace_id: string
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          application_id?: string | null
          candidate_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title: string
          workspace_id: string
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          application_id?: string | null
          candidate_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_activities_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_activities_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_applications: {
        Row: {
          candidate_id: string
          cover_letter: string | null
          created_at: string
          cv_file_name: string | null
          cv_file_size: number | null
          cv_file_type: string | null
          cv_storage_key: string | null
          cv_uploaded_at: string | null
          hired_at: string | null
          id: string
          job_opening_id: string
          rejected_at: string | null
          rejection_reason: string | null
          stage: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          candidate_id: string
          cover_letter?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_file_size?: number | null
          cv_file_type?: string | null
          cv_storage_key?: string | null
          cv_uploaded_at?: string | null
          hired_at?: string | null
          id?: string
          job_opening_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          stage?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          candidate_id?: string
          cover_letter?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_file_size?: number | null
          cv_file_type?: string | null
          cv_storage_key?: string | null
          cv_uploaded_at?: string | null
          hired_at?: string | null
          id?: string
          job_opening_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          stage?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_applications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_applications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          avatar_url: string | null
          bio: string | null
          converted_user_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          portfolio_url: string | null
          skills: string[] | null
          updated_at: string
          workspace_id: string
          years_of_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          converted_user_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          updated_at?: string
          workspace_id: string
          years_of_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          converted_user_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          updated_at?: string
          workspace_id?: string
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          created_at: string
          department_id: string
          id: string
          job_title: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          job_title?: string | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          job_title?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          lead_id: string | null
          name: string
          slug: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          lead_id?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          lead_id?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_assets: {
        Row: {
          asset_name: string
          asset_type: string
          assigned_date: string
          created_at: string
          id: string
          serial_number: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          asset_name: string
          asset_type?: string
          assigned_date?: string
          created_at?: string
          id?: string
          serial_number?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          asset_name?: string
          asset_type?: string
          assigned_date?: string
          created_at?: string
          id?: string
          serial_number?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          name: string
          uploaded_by: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_size?: number | null
          file_url: string
          id?: string
          name: string
          uploaded_by?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          name?: string
          uploaded_by?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboardings: {
        Row: {
          application_id: string | null
          candidate_id: string | null
          checklist: Json
          completed_at: string | null
          completed_by: string | null
          created_at: string
          employee_id: string | null
          id: string
          progress_percentage: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          application_id?: string | null
          candidate_id?: string | null
          checklist?: Json
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          progress_percentage?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string | null
          checklist?: Json
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          progress_percentage?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboardings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_work_history: {
        Row: {
          created_at: string
          department_name: string
          end_date: string | null
          id: string
          is_current: boolean | null
          notes: string | null
          role_title: string
          start_date: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          department_name: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          role_title: string
          start_date?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          department_name?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          role_title?: string
          start_date?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_work_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_feedback: {
        Row: {
          application_id: string
          candidate_id: string
          communication_rating: number | null
          created_at: string
          culture_fit_rating: number | null
          id: string
          interview_id: string
          interviewer_id: string
          notes: string | null
          overall_rating: number | null
          problem_solving_rating: number | null
          recommendation: string
          technical_skills_rating: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          application_id: string
          candidate_id: string
          communication_rating?: number | null
          created_at?: string
          culture_fit_rating?: number | null
          id?: string
          interview_id: string
          interviewer_id: string
          notes?: string | null
          overall_rating?: number | null
          problem_solving_rating?: number | null
          recommendation: string
          technical_skills_rating?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          application_id?: string
          candidate_id?: string
          communication_rating?: number | null
          created_at?: string
          culture_fit_rating?: number | null
          id?: string
          interview_id?: string
          interviewer_id?: string
          notes?: string | null
          overall_rating?: number | null
          problem_solving_rating?: number | null
          recommendation?: string
          technical_skills_rating?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          candidate_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          interviewer_id: string | null
          job_opening_id: string
          location_or_link: string | null
          notes: string | null
          round_name: string
          scheduled_at: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          application_id: string
          candidate_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          interviewer_id?: string | null
          job_opening_id: string
          location_or_link?: string | null
          notes?: string | null
          round_name?: string
          scheduled_at: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          application_id?: string
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          interviewer_id?: string | null
          job_opening_id?: string
          location_or_link?: string | null
          notes?: string | null
          round_name?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          application_deadline: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          employment_type: string
          hiring_manager_id: string | null
          id: string
          location: string
          requirements: string[] | null
          responsibilities: string[] | null
          salary_range: string | null
          skills: string[] | null
          slug: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          application_deadline?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string
          hiring_manager_id?: string | null
          id?: string
          location?: string
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary_range?: string | null
          skills?: string[] | null
          slug?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          application_deadline?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string
          hiring_manager_id?: string | null
          id?: string
          location?: string
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary_range?: string | null
          skills?: string[] | null
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          allocated: number
          created_at: string
          id: string
          leave_type: string
          remaining: number
          updated_at: string
          used: number
          user_id: string
          workspace_id: string
        }
        Insert: {
          allocated?: number
          created_at?: string
          id?: string
          leave_type: string
          remaining?: number
          updated_at?: string
          used?: number
          user_id: string
          workspace_id: string
        }
        Update: {
          allocated?: number
          created_at?: string
          id?: string
          leave_type?: string
          remaining?: number
          updated_at?: string
          used?: number
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          attachment_url: string | null
          created_at: string
          duration_days: number
          end_date: string
          id: string
          leave_type: string
          reason: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          duration_days?: number
          end_date: string
          id?: string
          leave_type: string
          reason: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          duration_days?: number
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          application_id: string
          candidate_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          employment_type: string
          expiration_date: string | null
          id: string
          job_title: string
          offer_notes: string | null
          reporting_manager_id: string | null
          salary: string
          start_date: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          application_id: string
          candidate_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employment_type?: string
          expiration_date?: string | null
          id?: string
          job_title: string
          offer_notes?: string | null
          reporting_manager_id?: string | null
          salary: string
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          application_id?: string
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employment_type?: string
          expiration_date?: string | null
          id?: string
          job_title?: string
          offer_notes?: string | null
          reporting_manager_id?: string | null
          salary?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          project_id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          project_id: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          project_id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          icon: string
          id: string
          lead_id: string | null
          name: string
          priority: string
          slug: string
          start_date: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          lead_id?: string | null
          name: string
          priority?: string
          slug: string
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          lead_id?: string | null
          name?: string
          priority?: string
          slug?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activities: {
        Row: {
          action_type: string
          created_at: string
          details: Json
          id: string
          task_id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json
          id?: string
          task_id: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json
          id?: string
          task_id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          assigned_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          task_id: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          task_id: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          created_at: string
          feedback: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          task_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          task_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          task_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approver_id: string | null
          created_at: string
          created_by: string | null
          deliverable_type: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          expected_outcome: string | null
          id: string
          is_draft: boolean | null
          notify_assignees: boolean | null
          notify_department: boolean | null
          priority: string
          project_id: string | null
          requires_approval: boolean | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_type?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          expected_outcome?: string | null
          id?: string
          is_draft?: boolean | null
          notify_assignees?: boolean | null
          notify_department?: boolean | null
          priority?: string
          project_id?: string | null
          requires_approval?: boolean | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_type?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          expected_outcome?: string | null
          id?: string
          is_draft?: boolean | null
          notify_assignees?: boolean | null
          notify_department?: boolean | null
          priority?: string
          project_id?: string | null
          requires_approval?: boolean | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_activities: {
        Row: {
          action_type: string
          created_at: string
          department_id: string | null
          details: Json
          id: string
          message: string
          project_id: string | null
          task_id: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          department_id?: string | null
          details?: Json
          id?: string
          message: string
          project_id?: string | null
          task_id?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          department_id?: string | null
          details?: Json
          id?: string
          message?: string
          project_id?: string | null
          task_id?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_activities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_document_comments: {
        Row: {
          author_avatar: string | null
          author_name: string
          content: string
          created_at: string
          document_id: string
          id: string
          resolved: boolean | null
          user_id: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_name: string
          content: string
          created_at?: string
          document_id: string
          id?: string
          resolved?: boolean | null
          user_id?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_name?: string
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          resolved?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "workspace_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_document_shares: {
        Row: {
          created_at: string
          department_id: string | null
          document_id: string
          id: string
          permission: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          document_id: string
          id?: string
          permission?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          document_id?: string
          id?: string
          permission?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_document_shares_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "workspace_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_document_versions: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string
          content: string
          created_at: string
          document_id: string
          id: string
          note: string | null
          version_number: string
        }
        Insert: {
          author_avatar?: string | null
          author_id?: string | null
          author_name: string
          content: string
          created_at?: string
          document_id: string
          id?: string
          note?: string | null
          version_number: string
        }
        Update: {
          author_avatar?: string | null
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          note?: string | null
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "workspace_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_documents: {
        Row: {
          access_level: string
          author_id: string | null
          category: string
          content: string
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          is_starred: boolean | null
          is_trash: boolean | null
          project_id: string | null
          read_time_minutes: number | null
          status: string
          subtitle: string | null
          title: string
          updated_at: string
          word_count: number | null
          workspace_id: string
        }
        Insert: {
          access_level?: string
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_starred?: boolean | null
          is_trash?: boolean | null
          project_id?: string | null
          read_time_minutes?: number | null
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
          word_count?: number | null
          workspace_id: string
        }
        Update: {
          access_level?: string
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_starred?: boolean | null
          is_trash?: boolean | null
          project_id?: string | null
          read_time_minutes?: number | null
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          word_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_file_activities: {
        Row: {
          action_type: string
          created_at: string
          file_id: string | null
          folder_id: string | null
          id: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          action_type: string
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          action_type?: string
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_file_activities_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "workspace_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_file_activities_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_file_shares: {
        Row: {
          created_at: string
          department_id: string | null
          file_id: string | null
          folder_id: string | null
          id: string
          permission: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          permission?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          permission?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_file_shares_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "workspace_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_file_shares_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_files: {
        Row: {
          access_level: string
          created_at: string
          department_id: string | null
          description: string | null
          extension: string | null
          file_size: number
          file_type: string
          file_url: string
          folder_id: string | null
          id: string
          is_starred: boolean | null
          is_trash: boolean | null
          name: string
          project_id: string | null
          task_id: string | null
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          extension?: string | null
          file_size?: number
          file_type?: string
          file_url: string
          folder_id?: string | null
          id?: string
          is_starred?: boolean | null
          is_trash?: boolean | null
          name: string
          project_id?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          extension?: string | null
          file_size?: number
          file_type?: string
          file_url?: string
          folder_id?: string | null
          id?: string
          is_starred?: boolean | null
          is_trash?: boolean | null
          name?: string
          project_id?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_files_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_folders: {
        Row: {
          access_level: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_starred: boolean | null
          is_trash: boolean | null
          name: string
          parent_id: string | null
          project_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_starred?: boolean | null
          is_trash?: boolean | null
          name: string
          parent_id?: string | null
          project_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_starred?: boolean | null
          is_trash?: boolean | null
          name?: string
          parent_id?: string | null
          project_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_folders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          department_id: string | null
          email: string
          employee_id: string | null
          employment_type: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          invited_by: string | null
          job_title: string | null
          role: string
          status: string
          token: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          employee_id?: string | null
          employment_type?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          invited_by?: string | null
          job_title?: string | null
          role?: string
          status?: string
          token?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          employee_id?: string | null
          employment_type?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          invited_by?: string | null
          job_title?: string | null
          role?: string
          status?: string
          token?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_meetings: {
        Row: {
          agenda: Json
          attachments: Json
          attendee_count: number
          attendees: Json
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          end_time: string
          id: string
          location: string | null
          meeting_url: string | null
          notes: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agenda?: Json
          attachments?: Json
          attendee_count?: number
          attendees?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          end_time: string
          id?: string
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agenda?: Json
          attachments?: Json
          attendee_count?: number
          attendees?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          end_time?: string
          id?: string
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          employment_status: string | null
          employment_type: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          interests: string[] | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          manager_id: string | null
          phone: string | null
          role: string
          skills: string[] | null
          user_id: string
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_status?: string | null
          employment_type?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          interests?: string[] | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          manager_id?: string | null
          phone?: string | null
          role?: string
          skills?: string[] | null
          user_id: string
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_status?: string | null
          employment_type?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          interests?: string[] | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          manager_id?: string | null
          phone?: string | null
          role?: string
          skills?: string[] | null
          user_id?: string
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_notifications: {
        Row: {
          action_url: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read: boolean
          subtitle: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          action_url?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          subtitle?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          action_url?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          subtitle?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          slug: string
          team_size: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          slug: string
          team_size?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          slug?: string
          team_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_workspace_with_owner: {
        Args: { icon?: string; name: string; slug: string }
        Returns: Json
      }
      get_workspace_role: {
        Args: { u_id?: string; ws_id: string }
        Returns: string
      }
      has_workspace_role: {
        Args: { roles: string[]; u_id?: string; ws_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { u_id?: string; ws_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

