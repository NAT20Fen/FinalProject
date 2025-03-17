import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Upload, X, Download } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function FileUpload() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [alert, setAlert] = useState(null);

  const { data: files, isLoading } = useQuery({
    queryKey: ["/api/files"],
  });

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("filename", filename || selectedFile.name);
      const response = await apiRequest("POST", "/api/files", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setSelectedFile(null);
      setFilename("");
      showAlert("File uploaded successfully");
    },
    onError: (error) => {
      showAlert(error.message, 'danger');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showAlert("Please select a file", 'danger');
      return;
    }
    uploadMutation.mutate();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        showAlert("Maximum file size is 5MB", 'danger');
        return;
      }
      setSelectedFile(file);
      setFilename(file.name);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilename("");
  };

  const handleDownload = (downloadUrl) => {
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="container py-4">
      <h2 className="display-6 mb-4">File Upload</h2>
      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <Upload className="text-primary" size={20} />
                Upload New File
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="file" className="form-label">Choose File</label>
                  <input
                    type="file"
                    className="form-control"
                    id="file"
                    onChange={handleFileSelect}
                    accept="*/*"
                  />
                </div>

                {selectedFile && (
                  <div className="alert alert-info d-flex align-items-center">
                    <FileText className="me-2" size={16} />
                    <span className="flex-grow-1 text-truncate">
                      {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={clearSelectedFile}
                      aria-label="Clear selection"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="filename" className="form-label">Display Name (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="Enter display name"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={uploadMutation.isPending || !selectedFile}
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload File"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <FileText className="text-primary" size={20} />
                Uploaded Files
              </h5>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="list-group">
                  {files?.length === 0 ? (
                    <p className="text-muted text-center py-4">
                      No files uploaded yet
                    </p>
                  ) : (
                    files?.map((file) => (
                      <div
                        key={file.id}
                        className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                      >
                        <div className="d-flex align-items-center gap-2">
                          <FileText className="text-primary" size={16} />
                          <div>
                            <h6 className="mb-0">{file.filename}</h6>
                            <small className="text-muted">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleDownload(file.downloadUrl)}
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}