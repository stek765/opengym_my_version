import Icon from './Icon.jsx'

export default function Back({ label, onClick }) {
  return <button className="back" onClick={onClick}><Icon name="chevronLeft" />{label}</button>
}
