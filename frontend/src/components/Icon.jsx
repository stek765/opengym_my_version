import {
  ArrowUp, Bell, Calendar, ChartLine, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList,
  Dumbbell, Flame, Settings, Globe, Info, Pencil, User, Play, Plus, Minus, RotateCcw, Scale, Sparkles,
  PersonStanding, Timer, Trash2, X, List, Search, GripVertical, Clock, House, CircleHelp, Repeat, SkipForward,
  Folder, FileText, Upload
} from 'lucide-react'

// The app's old names for its icons, now drawn by lucide (one consistent, well-known set).
const L = {
  arrowUp: ArrowUp, bell: Bell, calendar: Calendar, chartLine: ChartLine, check: Check, chevronDown: ChevronDown,
  chevronLeft: ChevronLeft, chevronRight: ChevronRight, chevronUp: ChevronUp, clipboard: ClipboardList,
  dumbbell: Dumbbell, flame: Flame, gear: Settings, globe: Globe, info: Info, pencil: Pencil, person: User,
  play: Play, plus: Plus, minus: Minus, reset: RotateCcw, scale: Scale, sparkles: Sparkles, stretch: PersonStanding,
  timer: Timer, trash: Trash2, xmark: X, list: List, magnifier: Search, grip: GripVertical, clock: Clock,
  house: House, swap: Repeat, skip: SkipForward, folder: Folder, file: FileText, upload: Upload
}

export default function Icon({ name, size = 20, className, ...rest }) {
  const C = L[name] || CircleHelp
  return <C size={size} strokeWidth={1.8} className={className} aria-hidden="true" {...rest} />
}
