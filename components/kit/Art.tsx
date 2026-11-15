import Image from 'next/image';
import { ART, type ArtFile, type ArtName } from './art-manifest';
import { cn } from './cn';

export { ART, type ArtFile, type ArtName } from './art-manifest';

export interface PictureProps {
  file: ArtFile;
  /** Rendered width in CSS pixels. The height follows the file's own proportions. */
  size: number;
  /** Pictures are decorative by default: the words beside them carry the meaning. */
  alt?: string;
  /** Load ahead of the rest of the page. For the one picture in the first violet block. */
  priority?: boolean;
  className?: string;
}

/** Any file from the manifest in art-manifest.ts, on next/image. */
export function Picture({ file, size, alt = '', priority = false, className }: PictureProps) {
  return (
    <Image
      src={file.src}
      width={size}
      height={Math.round((size * file.height) / file.width)}
      alt={alt}
      preload={priority}
      draggable={false}
      className={cn('shrink-0 select-none', className)}
    />
  );
}

export interface ArtProps extends Omit<PictureProps, 'file'> {
  name: ArtName;
}

/** One glossy 3D object from public/art. */
export function Art({ name, ...rest }: ArtProps) {
  return <Picture file={ART[name]} {...rest} />;
}
