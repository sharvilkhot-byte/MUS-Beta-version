import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface WhiteLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logoData: string) => void;
  initialLogo: string | null;
}

const ASPECT_RATIOS = [
  { label: 'Square (1:1)', value: 1 / 1 },
  { label: 'Landscape (16:9)', value: 16 / 9 },
  { label: 'Banner (3:1)', value: 3 / 1 },
  { label: 'Free', value: undefined },
];

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export const WhiteLabelModal: React.FC<WhiteLabelModalProps> = ({ isOpen, onClose, onSave, initialLogo }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialLogo);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset state when modal opens or initialLogo changes
    if (isOpen) {
      setImageSrc(initialLogo);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setAspect(undefined);
    }
  }, [isOpen, initialLogo]);


  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Reset crop
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || ''), false);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (aspect) {
      setCrop(centerAspectCrop(width, height, aspect));
    } else {
      // Default center crop for free mode
      setCrop(centerCrop(
        { unit: '%', width: 50, height: 50, x: 25, y: 25 },
        width,
        height
      ));
    }
  };

  const handleAspectChange = (value: number | undefined) => {
    setAspect(value);
    if (imgRef.current && value) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, value));
    } else if (imgRef.current && !value && crop) {
      // If switching to free, keep current dimensions but unconstrain aspect
      setCrop({ ...crop });
    }
  }

  const getCroppedImg = async (image: HTMLImageElement, pixelCrop: PixelCrop) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    ctx.imageSmoothingEnabled = true;

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return canvas.toDataURL('image/png');
  };

  const handleSave = async () => {
    if (imgRef.current && completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      try {
        const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
        if (croppedImage) {
          onSave(croppedImage);
          onClose();
        }
      } catch (e) {
        console.error(e);
      }
    } else if (imageSrc && !completedCrop) {
      // If no crop happened (just uploaded), save original (or full size if that's what we want)
      // Generally good to force a crop init, but if they just save immediately:
      onSave(imageSrc);
      onClose();
    }
  };

  const handleRemove = () => {
    setImageSrc(null);
    onSave('');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add Custom Logo (White Label)</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload and crop your logo. Use "Free" mode to drag handles freely.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {!imageSrc ? (
            <div className="flex items-center justify-center w-full min-h-[300px]">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-3 bg-slate-100 rounded-full group-hover:bg-indigo-100 mb-3 transition-colors">
                    <svg className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="mb-2 text-sm text-slate-500"><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-slate-400">PNG, JPG (MAX. 5MB)</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cropper Container */}
              <div className="flex justify-center bg-slate-900 rounded-lg overflow-hidden min-h-[300px] items-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  className="max-h-[50vh]"
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageSrc}
                    onLoad={onImageLoad}
                    style={{ maxHeight: '50vh', maxWidth: '100%', objectFit: 'contain' }}
                  />
                </ReactCrop>
              </div>

              {/* Controls Bar */}
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-slate-700">Aspect Ratio</span>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.label}
                        onClick={() => handleAspectChange(ratio.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${aspect === ratio.value
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="cursor-pointer px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-2 w-fit">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
                  Change Image
                  <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-between items-center">
          {imageSrc ? (
            <button
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Remove Logo
            </button>
          ) : <div></div>}

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!imageSrc}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Save Logo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
