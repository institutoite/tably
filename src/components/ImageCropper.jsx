
import React, { useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

function ImageCropper({ src, onCropComplete, onCancel }) {
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState();
    const [aspect, setAspect] = useState(1);
    const imgRef = React.useRef(null);

    function onImageLoad(e) {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, aspect));
    }

    function handleCrop() {
        if (!completedCrop || !imgRef.current) {
            return;
        }
        const canvas = document.createElement('canvas');
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            imgRef.current,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width,
            completedCrop.height
        );
        const base64Image = canvas.toDataURL('image/jpeg');
        onCropComplete(base64Image);
    }


    return (
        // Overlay de nivel más alto para evitar quedar por debajo de otros elementos fijos
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
            {/* Capa semitransparente de fondo */}
            <div className="absolute inset-0 bg-black/80" />
            {/* Contenido del modal por encima del overlay */}
            <div className="relative z-10 bg-card p-6 rounded-lg max-w-lg w-full mx-auto top-1/2 -translate-y-1/2">
                <h2 className="text-xl font-bold mb-4">Recortar Imagen</h2>
                <div className="flex justify-center">
                    <ReactCrop
                        crop={crop}
                        onChange={c => setCrop(c)}
                        onComplete={c => setCompletedCrop(c)}
                        aspect={aspect}
                    >
                        <img ref={imgRef} src={src} onLoad={onImageLoad} alt="Crop preview" style={{ maxHeight: '70vh' }}/>
                    </ReactCrop>
                </div>
                {/* Botonera con z-index alto para estar siempre en primer plano */}
                <div className="flex justify-end space-x-2 mt-4 relative z-20">
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button onClick={handleCrop}>Guardar Imagen</Button>
                </div>
            </div>
        </div>
    );
}

export default ImageCropper;
