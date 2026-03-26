-- 0003_storage.sql
-- Thinkora: Storage bucket and policies for file uploads.

-- Create the uploads bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    false,
    52428800, -- 50 MB limit
    ARRAY[
        'application/pdf',
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/json',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'audio/mpeg',
        'audio/wav',
        'video/mp4'
    ]
);

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Users can upload files to their own folder: uploads/{user_id}/*
CREATE POLICY "uploads_insert_own"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can read their own uploaded files
CREATE POLICY "uploads_select_own"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own uploaded files
CREATE POLICY "uploads_update_own"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own uploaded files
CREATE POLICY "uploads_delete_own"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'uploads'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
