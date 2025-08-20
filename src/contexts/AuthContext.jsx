
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (sessionUser) => {
    if (!sessionUser) return null;
    
    const { data: userProfile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        profile_picture,
        users_data (
          phone_number
        )
      `)
      .eq('id', sessionUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error al obtener el perfil de usuario:", error.message);
      // Si el error es por la relación, intentamos obtener solo el perfil
      if (error.code === 'PGRST200') {
        const { data: basicProfile, error: basicError } = await supabase
          .from('profiles')
          .select('id, name, profile_picture')
          .eq('id', sessionUser.id)
          .single();
        if (basicError) return null;
        return { ...basicProfile, phone: 'N/A' };
      }
      return null;
    }

    if (userProfile) {
      const phone = userProfile.users_data && userProfile.users_data.length > 0 ? userProfile.users_data[0].phone_number : null;
      const combinedUser = { id: userProfile.id, name: userProfile.name, profile_picture: userProfile.profile_picture, phone };
      return combinedUser;
    }
    return null;
  };

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const fullUser = await fetchUserProfile(session.user);
          setUser(fullUser);
        }
      } catch (error) {
        console.error("Error al obtener la sesión:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const fullUser = await fetchUserProfile(session?.user);
      setUser(fullUser);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const register = async (userData) => {
    const cleanPhone = userData.phone.replace(/[^0-9]/g, '');
    const fakeEmail = `${cleanPhone}@tably.com`;
    
    try {
      // Paso 1: Registrar al usuario.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            profile_picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=0D8ABC&color=fff`
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario.");

      // Paso 2: Insertar el número de teléfono.
      // Esto ahora funcionará gracias a la política de RLS actualizada.
      const { error: dataError } = await supabase
        .from('users_data')
        .insert({ id: authData.user.id, phone_number: userData.phone });

      if (dataError) {
        console.error("Error crítico: No se pudo guardar el número de teléfono después del registro.", dataError.message);
        // Si falla, intentamos eliminar al usuario para evitar cuentas huérfanas.
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error("No se pudo completar el registro. Por favor, intenta de nuevo.");
      }
      
      toast({ title: "¡Registro exitoso!", description: "Tu cuenta ha sido creada. ¡Ya puedes iniciar sesión!" });
      return { success: true };

    } catch (error) {
      toast({ title: "Error en el registro", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    }
  };

  const login = async (phone, password) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fakeEmail = `${cleanPhone}@tably.com`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          throw new Error("La verificación de correo está activada en Supabase. Por favor, desactívala desde el panel de control.");
        }
        throw error;
      }
      if (!data.user) throw new Error("No se pudo iniciar sesión");

      const fullUser = await fetchUserProfile(data.user);
      if (fullUser) {
        setUser(fullUser);
        toast({ title: "¡Bienvenido de vuelta!", description: `Hola ${fullUser.name}` });
        // Refresca la página para asegurar el contexto actualizado
        setTimeout(() => {
          window.location.reload();
        }, 500);
        return { success: true };
      }
      
      throw new Error("No se encontró el perfil del usuario.");

    } catch (error) {
      toast({ title: "Error en el inicio de sesión", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      toast({ title: "Sesión cerrada", description: "¡Hasta pronto!" });
      // Refresca la página para asegurar el contexto actualizado
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast({ title: "Error al cerrar sesión", description: error.message, variant: "destructive" });
    }
  };

  const updateUser = async (updatedUserData) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: updatedUserData.name,
          profile_picture: updatedUserData.profile_picture,
        })
        .eq('id', user.id)
        .select('id, name, profile_picture')
        .single();

      if (error) throw error;
      
      setUser(prevUser => ({ ...prevUser, ...data }));

    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    }
  };

  const value = {
    user,
    register,
    login,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
