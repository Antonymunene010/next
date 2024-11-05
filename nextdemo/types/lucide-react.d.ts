declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }
  
  export const Crown: FC<IconProps>
  export const Upload: FC<IconProps>
  export const ChevronDown: FC<IconProps>
  export const ChevronUp: FC<IconProps>
  // Add other icons as needed
} 