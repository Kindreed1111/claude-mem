export type RecordType = 'album' | 'ep' | 'single' | 'compile';

export interface Artist {
  id: number;
  name: string;
  picture: string;
  fans: number;
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
