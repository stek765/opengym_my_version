import Icon from './Icon.jsx'

export default function Back({ label, onClick }) {
  return <button className="back" onClick={onClick}><span className="iconbtn"><Icon name="chevronLeft" /></span>{label}</button>
}
