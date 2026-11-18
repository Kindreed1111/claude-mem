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
  preview: string;
  artistId: number;
  artistName: string;
  projectId: number;
  /** Popularité Deezer (plus grand = plus écouté). */
  rank?: number;
}

export type ProjectWithTracks = Project & { tracks: Track[] };
