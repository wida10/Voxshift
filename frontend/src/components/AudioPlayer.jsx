export default function AudioPlayer({ url, label }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-400 mb-3">{label || 'Audio procesado'}</p>
      <audio controls src={url} className="w-full" />
      <a
        href={url}
        download="voxshift-translated.mp3"
        className="btn-primary mt-4 w-full text-center block"
      >
        Descargar MP3
      </a>
    </div>
  );
}
