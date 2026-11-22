export default function Desfazer({ texto, onDesfazer }) {
  return (
    <div className="desfazer" role="status">
      <span>{texto}</span>
      <button onClick={onDesfazer}>Desfazer</button>
    </div>
  )
}
