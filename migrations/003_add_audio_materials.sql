-- Add audio_materials column to lessons table
-- Stores "filename::url" pairs for lesson audio MP3 files
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS audio_materials text[];
