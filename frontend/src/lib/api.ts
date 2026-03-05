import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('dmm_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle 401/403 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('dmm_token');
                localStorage.removeItem('dmm_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth
export const login = (email: string, password: string) =>
    api.post('/auth/login', { email, password });

export const register = (name: string, email: string, password: string, role?: string) =>
    api.post('/auth/register', { name, email, password, role });

// Clients
export const getClients = () => api.get('/clients');
export const getClient = (id: string) => api.get(`/clients/${id}`);
export const createClient = (name: string, slug: string) =>
    api.post('/clients', { name, slug });
export const deleteClient = (id: string) => api.delete(`/clients/${id}`);

// Projects
export const getProjects = (clientId?: string) =>
    api.get('/projects', { params: clientId ? { client_id: clientId } : {} });
export const createProject = (clientId: string, name: string, slug: string) =>
    api.post('/projects', { client_id: clientId, name, slug });
export const deleteProject = (id: string) => api.delete(`/projects/${id}`);

// Domains
export const getDomains = (projectId?: string) =>
    api.get('/domains', { params: projectId ? { project_id: projectId } : {} });
export const createDomain = (projectId: string, domain: string) =>
    api.post('/domains', { project_id: projectId, domain });
export const deleteDomain = (id: string) => api.delete(`/domains/${id}`);

// Images
export const getImages = (params?: Record<string, string>) =>
    api.get('/images', { params });
export const searchImages = (query: string) =>
    api.get('/images/search', { params: { q: query } });
export const getImage = (id: string) => api.get(`/images/${id}`);
export const deleteImage = (id: string) => api.delete(`/images/${id}`);
export const uploadImages = (formData: FormData) =>
    api.post('/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
export const addImageTags = (imageId: string, tags: string[]) =>
    api.post(`/images/${imageId}/tags`, { tags });

// Tags
export const getTags = () => api.get('/tags');
export const createTag = (name: string) => api.post('/tags', { name });
export const deleteTag = (id: string) => api.delete(`/tags/${id}`);

// Users
export const getUsers = () => api.get('/users');
export const updateUser = (id: string, data: Record<string, string>) =>
    api.put(`/users/${id}`, data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`);

export default api;
