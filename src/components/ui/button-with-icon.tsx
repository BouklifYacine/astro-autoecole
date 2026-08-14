import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react"
import { ArrowUpRightIcon } from "@phosphor-icons/react"

import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ButtonWithIconSize = "sm" | "default" | "lg"

type ContentProps =
  | { label: string; children?: never }
  | { label?: never; children: ReactNode }

type CommonProps = ContentProps & {
  icon?: ReactNode
  iconPosition?: "start" | "end"
  variant?: ButtonProps["variant"]
  size?: ButtonWithIconSize
  className?: string
}

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href"> & {
    href: string
  }

type NativeButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: never
  }

export type ButtonWithIconProps = LinkProps | NativeButtonProps

const sizeStyles: Record<ButtonWithIconSize, { button: string; icon: string }> = {
  sm: {
    button: "h-10 ps-5 pe-12 text-xs hover:ps-12 hover:pe-5",
    icon: "size-8",
  },
  default: {
    button: "h-12 ps-6 pe-14 text-sm hover:ps-14 hover:pe-6",
    icon: "size-10",
  },
  lg: {
    button: "h-14 ps-7 pe-16 text-base hover:ps-16 hover:pe-7",
    icon: "size-12",
  },
}

function ButtonWithIcon({
  label,
  children,
  icon,
  iconPosition = "end",
  variant = "default",
  size = "default",
  className,
  href,
  ...props
}: ButtonWithIconProps) {
  const content = children ?? label
  const styles = sizeStyles[size]
  const iconNode = icon ?? <ArrowUpRightIcon aria-hidden="true" weight="bold" />
  const iconClassName = cn(
    "absolute top-1 flex items-center justify-center rounded-full bg-background text-foreground transition-all duration-500",
    styles.icon,
    iconPosition === "start"
      ? "left-1 group-hover:left-auto group-hover:right-1 group-hover:-rotate-45"
      : "right-1 group-hover:right-auto group-hover:left-1 group-hover:rotate-45",
  )
  const buttonClassName = cn(
    "group relative inline-flex w-fit cursor-pointer overflow-hidden rounded-full p-1 font-medium transition-all duration-500",
    styles.button,
    className,
  )

  const contentMarkup = (
    <>
      {iconPosition === "start" && (
        <span aria-hidden="true" className={iconClassName} data-icon="inline-start">
          {iconNode}
        </span>
      )}
      <span className="relative z-10 transition-all duration-500">{content}</span>
      {iconPosition === "end" && (
        <span aria-hidden="true" className={iconClassName} data-icon="inline-end">
          {iconNode}
        </span>
      )}
    </>
  )

  if (href !== undefined) {
    const { target, rel, ...anchorProps } = props as Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      "children" | "className" | "href"
    >

    return (
      <a
        {...anchorProps}
        href={href}
        target={target}
        rel={target === "_blank" ? (rel ?? "noopener noreferrer") : rel}
        className={cn(buttonVariants({ variant, size: "default" }), buttonClassName)}
      >
        {contentMarkup}
      </a>
    )
  }

  const buttonProps = props as Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "className"
  >

  return (
    <Button
      {...buttonProps}
      variant={variant}
      className={buttonClassName}
    >
      {contentMarkup}
    </Button>
  )
}

export { ButtonWithIcon }
export default ButtonWithIcon
