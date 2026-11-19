export interface ToggleFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}
