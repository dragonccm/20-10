"use client"
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
type Option = {
  value: string
  label: ReactNode
  disabled: boolean
  group?: string
}
function labelText(node: ReactNode): string {
  return Children.toArray(node)
    .map((n) =>
      isValidElement<{ children?: ReactNode }>(n)
        ? labelText(n.props.children)
        : String(n),
    )
    .join("")
}
function options(children: ReactNode, group?: string): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number
        children?: ReactNode
        disabled?: boolean
        label?: string
      }>(child)
    )
      return []
    if (child.type === "option")
      return [
        {
          value: String(child.props.value ?? labelText(child.props.children)),
          label: child.props.children,
          disabled: !!child.props.disabled,
          group,
        },
      ]
    if (child.type === Fragment || child.type === "optgroup")
      return options(child.props.children, child.props.label ?? group)
    return []
  })
}
type Props = {
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  name?: string
  required?: boolean
  id?: string
  title?: string
  style?: CSSProperties
  "aria-label"?: string
  "aria-labelledby"?: string
}
export function Select({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  disabled,
  name,
  required,
  ...props
}: Props) {
  const items = options(children),
    [local, setLocal] = useState(
      String(defaultValue ?? items.find((i) => !i.disabled)?.value ?? ""),
    ),
    empty = useId(),
    trigger = useRef<HTMLButtonElement>(null),
    [container, setContainer] = useState<HTMLElement | null>(null)
  useEffect(
    () =>
      setContainer(trigger.current?.closest<HTMLElement>(".studio-ui") ?? null),
    [],
  )
  const selected = String(value ?? local),
    encode = (v: string) => (v === "" ? empty : v)
  return (
    <SelectPrimitive.Root
      value={encode(selected)}
      onValueChange={(v) => {
        const next = v === empty ? "" : v
        if (value === undefined) setLocal(next)
        onValueChange?.(next)
      }}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectPrimitive.Trigger
        ref={trigger}
        {...props}
        className={cn("studio-select-trigger", className)}
        data-empty={selected === "" || undefined}
      >
        <SelectPrimitive.Value placeholder="Chọn…" />
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="studio-select-menu"
        >
          <SelectPrimitive.ScrollUpButton className="studio-select-scroll">
            <ChevronUp size={14} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="studio-select-viewport">
            {items.map((item) => (
              <SelectPrimitive.Item
                key={item.value}
                value={encode(item.value)}
                disabled={item.disabled}
                textValue={labelText(item.label)}
                className="studio-select-item"
              >
                <SelectPrimitive.ItemText>
                  {item.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check size={15} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="studio-select-scroll">
            <ChevronDown size={14} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
