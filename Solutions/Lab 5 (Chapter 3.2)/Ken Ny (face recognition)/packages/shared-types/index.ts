export interface FaceRecognitionResult {
  box: [number, number, number, number];
  name: string;
  distance: number;
}
