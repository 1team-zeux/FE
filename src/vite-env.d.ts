/// <reference types="vite/client" />

declare module 'elkjs/lib/elk.bundled.js' {
  import { ELKConstructorArguments, ELK } from 'elkjs/lib/elk-api'
  const ElkConstructor: new (args?: ELKConstructorArguments) => ELK
  export default ElkConstructor
}
