<?php
// Simple endpoint para subir imágenes a public/images/avatars
// Requiere ejecutar bajo Apache/PHP (XAMPP). En modo Vite dev server no funcionará.
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([ 'success' => false, 'error' => 'Método no permitido' ]);
        exit;
    }

    if (!isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode([ 'success' => false, 'error' => 'Archivo no recibido' ]);
        exit;
    }

    $userId = isset($_POST['userId']) ? preg_replace('/[^a-zA-Z0-9-]/', '', $_POST['userId']) : null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode([ 'success' => false, 'error' => 'userId requerido' ]);
        exit;
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode([ 'success' => false, 'error' => 'Error al subir el archivo' ]);
        exit;
    }

    // Validar mime
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $allowed = [ 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp' ];
    if (!isset($allowed[$mime])) {
        http_response_code(400);
        echo json_encode([ 'success' => false, 'error' => 'Formato no permitido' ]);
        exit;
    }

    $ext = $allowed[$mime];
    $targetDir = __DIR__ . '/images/avatars/' . $userId;
    if (!is_dir($targetDir)) {
        if (!mkdir($targetDir, 0775, true)) {
            http_response_code(500);
            echo json_encode([ 'success' => false, 'error' => 'No se pudo crear el directorio destino' ]);
            exit;
        }
    }

    $filename = time() . '.' . $ext;
    $targetPath = $targetDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        http_response_code(500);
        echo json_encode([ 'success' => false, 'error' => 'No se pudo guardar el archivo' ]);
        exit;
    }

    // URL accesible desde el front
    $publicUrl = '/images/avatars/' . $userId . '/' . $filename;
    echo json_encode([ 'success' => true, 'url' => $publicUrl ]);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([ 'success' => false, 'error' => $e->getMessage() ]);
    exit;
}

// ...dentro de tu componente Profile.jsx...
const uploadPendingImage = async () => {
  if (!pendingImage) return;
  setIsUploading(true);

  try {
    // Convierte la imagen base64 a Blob
    const res = await fetch(pendingImage);
    const blob = await res.blob();

    const form = new FormData();
    form.append('file', blob, 'avatar.jpg');
    form.append('userId', user.id);

    // Llama directamente al endpoint PHP
    const resp = await fetch('/upload.php', { method: 'POST', body: form });
    const json = await resp.json().catch(() => ({}));

    if (!resp.ok || !json.success || !json.url) {
      alert(json.error || 'No se pudo subir la imagen');
      setIsUploading(false);
      return;
    }

    // Actualiza el perfil con la nueva URL
    await updateUser({ ...user, profile_picture: json.url });
    setPendingImage(null);
    setAvatarSrc(json.url);
    alert('Imagen subida correctamente');
  } catch (err) {
    alert('Error al subir la imagen');
  } finally {
    setIsUploading(false);
  }
};
