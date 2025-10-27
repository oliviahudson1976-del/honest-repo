import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated.');
        return;
      }

      // Read file content
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;

        // Upload file to Supabase storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `uploads/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) {
          setError('Failed to upload file: ' + uploadError.message);
          setUploading(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath);

        // Insert record in uploaded_files table
        const { data: insertData, error: insertError } = await supabase
          .from('uploaded_files')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: publicUrl,
            file_type: file.type,
            status: 'pending'
          })
          .select('id')
          .single();

        if (insertError) {
          setError('Failed to save file record: ' + insertError.message);
          setUploading(false);
          return;
        }

        // Call AI extract function
        const { data: functionData, error: functionError } = await supabase.functions.invoke('ai-extract', {
          body: { fileId: insertData.id, content: content }
        });

        if (functionError) {
          setError('Failed to process file with AI: ' + functionError.message);
        } else {
          setSuccess('File uploaded and processed successfully!');
        }

        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError('An error occurred: ' + (err as Error).message);
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Upload Document for SmartDrafting</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Upload and Process'}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;