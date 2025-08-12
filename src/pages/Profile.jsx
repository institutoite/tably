
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Camera, Edit, FileDown, Loader2, Check, X } from 'lucide-react';
import ImageCropper from '@/components/ImageCropper';
import { resolvePhpImageUrl, withBase } from '@/lib/utils';
import { generateProfilePdf } from '@/lib/pdfGenerator';
import { supabase } from '@/lib/customSupabaseClient';

function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [isEditing, setIsEditing] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  // Imagen recortada guardada localmente (pendiente de subir)
  const [pendingImage, setPendingImage] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileInputRef = useRef(null);
  const [avatarSrc, setAvatarSrc] = useState('');

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');
      if (profilesError) throw profilesError;

      const { data: allTests, error: allTestsError } = await supabase
        .from('tests')
        .select('user_id, score, total_time');
      if (allTestsError) throw allTestsError;

      const usersWithStats = allProfiles.map(p => {
        const userResults = allTests.filter(test => test.user_id === p.id);
        if (userResults.length === 0) {
          return { id: p.id, bestScore: 0, bestTime: Infinity, totalTests: 0 };
        }
        const bestScore = Math.max(...userResults.map(test => test.score));
        const bestTime = Math.min(...userResults.filter(t => t.score === bestScore).map(t => t.total_time));
        return { id: p.id, bestScore, bestTime, totalTests: userResults.length };
      })
      .filter(u => u.totalTests > 0)
      .sort((a, b) => {
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return a.bestTime - b.bestTime;
      });

      const position = usersWithStats.findIndex(u => u.id === user.id) + 1;
      setRankings({ position: position > 0 ? position : null, total: usersWithStats.length });
    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Cargar foto pendiente desde localStorage si existe
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(`pendingProfileImage:${user.id}`);
      if (saved) setPendingImage(saved);
    } catch (e) {
      console.warn('No se pudo leer la imagen pendiente del almacenamiento local:', e);
    }
  }, [user]);

  useEffect(() => {
    const base = pendingImage || user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}`;
    setAvatarSrc(resolvePhpImageUrl(base));
  }, [pendingImage, user?.profile_picture, user?.name]);

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  const handleEditToggle = () => {
    setIsEditing(true);
  };

  const handleSaveName = () => {
    if (name !== user.name) {
      updateUser({ ...user, name });
      toast({ title: 'Nombre actualizado', description: 'Tu nombre ha sido cambiado exitosamente.' });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setName(user.name);
    setIsEditing(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Guardar recorte localmente, para subirlo luego
  const handleCropComplete = async (croppedImageUrl) => {
    try {
      // Guardar como base64 en localStorage
      localStorage.setItem(`pendingProfileImage:${user.id}`, croppedImageUrl);
      setPendingImage(croppedImageUrl);
      setImageSrc(null);
      toast({ title: 'Imagen guardada localmente', description: 'Podrás subirla cuando lo decidas.' });
    } catch (error) {
      console.error('No se pudo guardar la imagen localmente:', error);
      toast({ title: 'Error', description: 'No se pudo guardar la imagen en este dispositivo.', variant: 'destructive' });
    }
  };

  // Subir la imagen pendiente al bucket de Supabase
  const uploadPendingImage = async () => {
    if (!pendingImage) return;
    try {
      const res = await fetch(pendingImage);
      const blob = await res.blob();
  const file = new File([blob], `profile-${user.id}.jpg`, { type: 'image/jpeg' });

      // 1) Intentamos Supabase primero
      let finalUrl = null;
      try {
        const filePath = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase
          .storage
          .from('avatars')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalUrl = data.publicUrl;
      } catch (err) {
        // 2) Fallback a backend local (PHP) que guarda en public/images/avatars
        // Requiere que estés sirviendo el proyecto con Apache/PHP (XAMPP) y no solo con Vite dev server.
        const form = new FormData();
        form.append('file', file);
        form.append('userId', user.id);
    const resp = await fetch(withBase('/upload.php'), { method: 'POST', body: form });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok || !json.success || !json.url) {
          const hint = err?.message?.includes('row-level security')
            ? 'Revisa las políticas RLS del bucket avatars o usa el backend local (XAMPP).'
      : 'Asegúrate de que upload.php esté desplegado en la misma carpeta base que tu app (p. ej. /public_html/tuapp/upload.php).';
          throw new Error(`No se pudo subir (Supabase/PHP). ${hint}`);
        }
        finalUrl = json.url; // ej: /images/avatars/<archivo>.jpg
      }

      await updateUser({ ...user, profile_picture: finalUrl });

      // Limpiar pendiente
      localStorage.removeItem(`pendingProfileImage:${user.id}`);
      setPendingImage(null);

      toast({ title: 'Foto subida', description: 'Tu foto de perfil ha sido actualizada.' });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      toast({
        title: 'No se pudo subir la imagen',
        description: `${error.message || error}`,
        variant: 'destructive',
      });
    }
  };

  const discardPendingImage = () => {
    try {
      localStorage.removeItem(`pendingProfileImage:${user.id}`);
      setPendingImage(null);
      toast({ title: 'Imagen descartada', description: 'Se eliminó la copia local.' });
    } catch {}
  };

  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      let userTests = [];
      try {
        const { data, error } = await supabase
          .from('tests')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
        if (!error && Array.isArray(data)) {
          userTests = data;
        } else if (error) {
          console.warn('No se pudieron obtener tests, se generará PDF sin historial:', error.message || error);
        }
      } catch (qErr) {
        console.warn('Fallo al consultar tests, continuando sin datos:', qErr);
      }

      // Fallback local si no hay datos del backend
      if (!userTests || userTests.length === 0) {
        try {
          const saved = JSON.parse(localStorage.getItem(`userTests:${user.id}`) || '[]');
          if (Array.isArray(saved) && saved.length) {
            userTests = saved;
          }
        } catch (e) {
          console.warn('No se pudo leer el historial local:', e);
        }
      }

      await generateProfilePdf(user, userTests, rankings);

      toast({
        title: '¡Reporte generado con éxito!',
        description: userTests.length
          ? 'Tu PDF se ha descargado con todas tus participaciones.'
          : 'Tu PDF se ha descargado. Aún no se encontraron participaciones para tu usuario.',
      });

    } catch (error) {
        console.error('Error al generar el PDF:', error);
        toast({
          title: 'Error al generar PDF',
          description: 'Ocurrió un problema inesperado al crear el reporte.',
          variant: 'destructive',
        });
    } finally {
        setIsGeneratingPdf(false);
    }
  };


  return (
    <>
      <Helmet>
        <title>Mi Perfil - Tably</title>
        <meta name="description" content="Gestiona tu perfil, revisa tu progreso y exporta tus resultados en Tably." />
      </Helmet>
      
      {imageSrc && (
        <ImageCropper
          src={imageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageSrc(null)}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <Card>
            <CardHeader className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <img
                  src={avatarSrc}
                  alt="Foto de perfil"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg"
                  onError={() => {
                    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}`;
                    setAvatarSrc(fallback);
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full w-10 h-10 bg-white dark:bg-slate-700"
                  onClick={() => fileInputRef.current.click()}
                >
                  <Camera className="w-5 h-5" />
                </Button>
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              {pendingImage && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded">Imagen guardada localmente</span>
                  <Button size="sm" onClick={uploadPendingImage}>Subir ahora</Button>
                  <Button size="sm" variant="outline" onClick={discardPendingImage}>Descartar</Button>
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                {isEditing ? (
                  <>
                    <Input
                      value={name}
                      onChange={handleNameChange}
                      className="text-2xl font-bold text-center w-auto"
                      autoFocus
                    />
                    <Button size="icon" onClick={handleSaveName} aria-label="Guardar nombre">
                      <Check className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleCancelEdit} aria-label="Cancelar edición">
                      <X className="w-5 h-5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <CardTitle className="text-3xl font-bold">{user.name}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={handleEditToggle} aria-label="Editar nombre">
                      <Edit className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
              <CardDescription>{user.phone}</CardDescription>
            </CardHeader>
            <CardContent className="mt-6">
              <div className="text-center">
                 <Button onClick={handleExportPDF} disabled={isGeneratingPdf}>
                    {isGeneratingPdf ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <FileDown className="w-4 h-4 mr-2" />
                    )}
                    {isGeneratingPdf ? 'Generando PDF...' : 'Exportar Perfil a PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}

export default Profile;
