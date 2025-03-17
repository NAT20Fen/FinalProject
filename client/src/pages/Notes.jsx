import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Plus, Trash2, FileText } from "lucide-react";
import { useState } from "react";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

export default function Notes() {
  const queryClient = useQueryClient();
  const [editingNote, setEditingNote] = useState(null);
  const [alert, setAlert] = useState(null);

  const form = useForm({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const { data: notes, isLoading } = useQuery({
    queryKey: ["/api/notes"],
  });

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const createNoteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/notes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      form.reset();
      showAlert("Note created successfully");
    },
    onError: (error) => {
      showAlert(error.message, 'danger');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest("PUT", `/api/notes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setEditingNote(null);
      form.reset();
      showAlert("Note updated successfully");
    },
    onError: (error) => {
      showAlert(error.message, 'danger');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      showAlert("Note deleted successfully");
    },
    onError: (error) => {
      let errorDetails = '';
      try {
        const errorData = JSON.parse(error.message.split(': ')[1]);
        errorDetails = errorData.details;
      } catch (e) {
        errorDetails = error.message;
      }
      showAlert(errorDetails, 'danger');
    },
  });

  const onSubmit = (data) => {
    if (editingNote) {
      updateNoteMutation.mutate({ id: editingNote.id, data });
    } else {
      createNoteMutation.mutate(data);
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    form.reset({
      title: note.title,
      content: note.displayContent || note.content,
    });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    form.reset();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate(id);
    }
  };

  return (
    <div className="container py-4">
      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}
      <h2 className="display-6 mb-4">Notes</h2>
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <Plus className="text-primary" size={20} />
                {editingNote ? "Edit Note" : "Create Note"}
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className={`form-control ${form.formState.errors.title ? 'is-invalid' : ''}`}
                    {...form.register("title")}
                    placeholder="Enter note title"
                  />
                  {form.formState.errors.title && (
                    <div className="invalid-feedback">
                      {form.formState.errors.title.message}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Content</label>
                  <textarea
                    className={`form-control ${form.formState.errors.content ? 'is-invalid' : ''}`}
                    {...form.register("content")}
                    placeholder="Enter note content"
                    rows={8}
                  />
                  {form.formState.errors.content && (
                    <div className="invalid-feedback">
                      {form.formState.errors.content.message}
                    </div>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1"
                    disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                  >
                    {createNoteMutation.isPending || updateNoteMutation.isPending
                      ? "Saving..."
                      : editingNote
                      ? "Update Note"
                      : "Create Note"}
                  </button>
                  {editingNote && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <FileText className="text-primary" size={20} />
                My Notes
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
                <div className="notes-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {notes?.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      No notes created yet
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {notes?.map((note) => (
                        <div key={note.id} className="card">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h5 className="card-title mb-0">{note.title}</h5>
                              <div className="btn-group">
                                <button
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => handleEdit(note)}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleDelete(note.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <p className="card-text text-muted">
                              {note.displayContent || note.content}
                            </p>
                            <div className="text-muted small">
                              Last updated: {new Date(note.updatedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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