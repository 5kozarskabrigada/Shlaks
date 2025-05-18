import { jwtDecode } from 'jwt-decode';

const BASE_URL = 'http://localhost:5054/api';

const isTokenExpired = (token) => {
    try {
        const decoded = jwtDecode(token);
        return decoded.exp < Date.now() / 1000;
    } catch {
        return true;
    }
};

const refreshToken = async () => {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        const authToken = localStorage.getItem('authToken');

        if (!refreshToken || !authToken) {
            throw new Error('No tokens found');
        }

        const response = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                accessToken: authToken,
                refreshToken: refreshToken
            })
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return data.accessToken;
    } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        throw error;
    }
};

const makeRequest = async (url, options = {}, retry = true) => {
    try {
        let authToken = localStorage.getItem('authToken');

        if (!authToken) {
            throw new Error('No authentication token found');
        }

        
        if (isTokenExpired(authToken)) {
            authToken = await refreshToken();
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.status === 401 && retry) {
            const newToken = await refreshToken();
            return makeRequest(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${newToken}`
                }
            }, false);
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Request failed');
        }

        
        if (response.status === 204) { 
            return null;
        }

        return response.json();
    } catch (error) {
        console.error('Request failed:', error);
        if (error.message.includes('Unauthorized')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
        }
        throw error;
    }
};



const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
};


export const createNote = async (title, content) => {
    const response = await makeRequest(`${BASE_URL}/notes`, {
        method: 'POST',
        body: JSON.stringify({
            Title: title,
            EncryptedContent: content
        })
    });
    return response;
};
// export const createNote = async (title, content) => {
//     try {
//         console.log("Creating note with:", { title, content: content.substring(0, 50) + '...' });
//         const response = await makeRequest('/api/notes', 'POST', {
//             title,
//             encryptedContent: content
//         });
//         return response;
//     } catch (error) {
//         console.error("Create note failed:", error);
//         throw error;
//     }
// };
// function isTokenExpired(token) {
//     try {
//         const decoded = jwtDecode(token);
//         return decoded.exp < Date.now() / 1000;
//     } catch {
//         return true;
//     }
// }

export const login = async (credentials) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const responseText = await response.text();

        if (!response.ok) {
            // Try to parse as JSON, fallback to raw text
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { message: responseText };
            }
            throw new Error(errorData.message || 'Login failed');
        }

        const data = JSON.parse(responseText);

        if (!data.accessToken || !data.refreshToken || !data.username || !data.userId) {
            throw new Error('Invalid login response format');
        }

        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', String(data.userId));

        return data;
    } catch (error) {
        console.error('Login API error:', error);
        clearAuthData();
        throw error;
    }
};

export const register = async (userData) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/register`, {  // Note: /api/auth/register
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
            credentials: 'include' // If using cookies
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Registration failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
};

export const refreshAuthToken = async () => {
    return refreshToken();
};



export const getNoteById = async (id) => {
    return makeRequest(`${BASE_URL}/notes/${id}`);
};

export const updateNote = async (id, { title, content }) => {
    return makeRequest(`${BASE_URL}/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            Title: title,
            EncryptedContent: content
        })
    });
};

// export const saveNote = async (id, { title, content }) => {
//     return makeRequest(`${BASE_URL}/notes`, {
//         method: 'POST',
//         body: JSON.stringify({
//             Id: id || undefined,
//             Title: title,
//             EncryptedContent: content
//         })
//     });
// };

export const saveNote = async (id, { title, content }) => {
    if (id) {
        // Update existing note
        return makeRequest(`${BASE_URL}/notes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                Title: title,
                EncryptedContent: content
            })
        });
    } else {
        // Create new note
        return makeRequest(`${BASE_URL}/notes`, {
            method: 'POST',
            body: JSON.stringify({
                Title: title,
                EncryptedContent: content
            })
        });
    }
};


export const deleteNote = async (id) => {
    console.log(`Attempting to delete note with ID: ${id}`);
    try {
        const response = await makeRequest(`${BASE_URL}/notes/${id}`, {
            method: 'DELETE'
        });
        console.log('Delete successful', response);
        return response;
    } catch (error) {
        console.error('Delete failed:', error);
        throw error;
    }
};

export const getUserNotes = async () => {
    try {
        return await makeRequest(`${BASE_URL}/notes`);
    } catch (error) {
        console.error('Failed to fetch notes:', error);
        throw error;
    }
};

export {
    clearAuthData
};


export const forgotPassword = async (data) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ Email: data.Email }) // Ensure proper casing
        });

        if (!response.ok) {
            const errorData = await response.json();

            if (response.status === 500) {
                throw new Error(errorData.Message || 'Email service unavailable. Try again later.');
            }
            throw new Error(errorData.message || 'Password reset failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Forgot password error:', error);

        // User-friendly messages
        let message = error.message;
        if (error.message.includes('Failed to fetch')) {
            message = 'Network error - please check your connection';
        } else if (error.message.includes('unavailable')) {
            message = 'Email service is temporarily unavailable. Please try again later.';
        }

        throw new Error(message);
    }
};

export const resetPassword = async (token, newPassword) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, newPassword })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Password reset failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Reset password error:', error);
        throw error;
    }
};

export const changePassword = async (oldPassword, newPassword) => {
    return makeRequest(`${BASE_URL}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({
            oldPassword,
            newPassword,
            confirmPassword: newPassword // Send confirmPassword to match backend DTO
        })
    });
};



export const uploadImage = async (base64Data) => {
    try {
        const response = await makeRequest(`${BASE_URL}/notes/upload-image`, {
            method: 'POST',
            body: JSON.stringify({ imageData: base64Data })
        });

        return response;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};