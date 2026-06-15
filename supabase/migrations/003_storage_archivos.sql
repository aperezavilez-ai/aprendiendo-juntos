-- Storage bucket + archivos compartibles al portal padres

ALTER TABLE archivos_paciente
  ADD COLUMN IF NOT EXISTS visible_a_padres BOOLEAN DEFAULT FALSE;

ALTER TABLE archivos_paciente
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('terapia-os-files', 'terapia-os-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Padre ve archivos de su hijo" ON archivos_paciente;
CREATE POLICY "Padre ve archivos de su hijo"
  ON archivos_paciente FOR SELECT
  USING (
    visible_a_padres = TRUE
    AND EXISTS (
      SELECT 1 FROM familiares f
      WHERE f.paciente_id = archivos_paciente.paciente_id
      AND f.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff sube archivos storage" ON storage.objects;
CREATE POLICY "Staff sube archivos storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'terapia-os-files'
    AND (storage.foldername(name))[1] = get_clinica_id()::text
    AND get_user_rol() != 'padre'
  );

DROP POLICY IF EXISTS "Staff lee archivos storage" ON storage.objects;
CREATE POLICY "Staff lee archivos storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'terapia-os-files'
    AND (storage.foldername(name))[1] = get_clinica_id()::text
    AND get_user_rol() != 'padre'
  );

DROP POLICY IF EXISTS "Staff elimina archivos storage" ON storage.objects;
CREATE POLICY "Staff elimina archivos storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'terapia-os-files'
    AND (storage.foldername(name))[1] = get_clinica_id()::text
    AND get_user_rol() != 'padre'
  );
