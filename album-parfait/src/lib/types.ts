export type RecordType = 'album' | 'ep' | 'single' | 'compile';

export interface Artist {
  id: number;
  name: string;
  picture: string;
  fans: number;
}

/** Pochette du mur de l'accueil (albums pressés par les visiteurs, puis classement rap Deezer France). */
export interface WallItem {
  albumId: number;
  title: string;
  /** 250 px */
  cover: string;
  /** 500 px */
  coverBig: string;
  artist: { id: number; name: string; picture: string };
}

export interface Project {
  id: number;
  title: string;
  cover: string;
  md5: string;
  releaseDate: string;
  recordType: RecordType;
}

export interface Track {
  id: number;
  title: string;
  titleVersion: string;
  position: number;
  disk: number;
  /** Un extrait de 30 s existe (le lien, qui expire vite, est demandé à /api/audio au moment d'écouter). */
  hasPreview: boolean;
  artistId: number;
  artistName: string;
  projectId: number;
  /** Popularité Deezer (plus grand = plus écouté). */
  rank?: number;
}

export type ProjectWithTracks = Project & { tracks: Track[] };
