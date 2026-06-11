/** SVGator export: innerHTML alone does not run embedded <script> tags. */
export function mountSvgAnimation(host: HTMLElement, svgMarkup: string): void {
  host.innerHTML = svgMarkup

  const scripts = Array.from(host.querySelectorAll('script'))
  for (const oldScript of scripts) {
    const script = document.createElement('script')
    for (const attr of oldScript.attributes) {
      script.setAttribute(attr.name, attr.value)
    }
    script.textContent = oldScript.textContent
    oldScript.remove()
    host.appendChild(script)
  }
}
