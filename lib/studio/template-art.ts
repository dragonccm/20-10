/** Original vector still lifes. No remote images, licensed assets or fonts. */
export function templateArt(
  variant: number,
  accent: string,
  paper: string,
  ink: string,
) {
  const warm = "#d7ab84",
    sage = "#a8b9a2",
    mist = "#d9e1db",
    cream = "#f7f2e8"
  const circle = (x: number, y: number, r: number, c: string) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`
  const rect = (x: number, y: number, w: number, h: number, c: string, r = 0) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`
  const line = (d: string, c = ink, w = 3) =>
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`
  const leaf = (x: number, y: number, rot: number, c = accent) =>
    `<ellipse cx="${x}" cy="${y}" rx="30" ry="68" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`
  let art = ""
  switch (variant % 10) {
    case 0: // A stem in a ceramic vase, drawn as a quiet editorial still life.
      art =
        rect(0, 0, 800, 800, cream) +
        rect(0, 625, 800, 175, mist) +
        `<ellipse cx="415" cy="651" rx="200" ry="22" fill="${ink}" opacity=".08"/>` +
        line("M410 560Q370 350 435 130", accent, 6) +
        line("M406 439Q505 317 552 264", accent, 5) +
        leaf(416, 203, -20) +
        leaf(385, 300, -54, sage) +
        leaf(447, 351, 40) +
        leaf(526, 292, 45, sage) +
        leaf(387, 425, -50) +
        `<path d="M319 500H485L504 634Q407 690 301 635Z" fill="${warm}"/>` +
        line("M327 525H478", cream, 2)
      break
    case 1: // Arched architecture and a late afternoon shadow.
      art =
        rect(0, 0, 800, 800, "#e9d7c2") +
        rect(0, 600, 800, 200, "#d2b493") +
        `<path d="M230 610V300a170 170 0 0 1 340 0V610Z" fill="${cream}"/>` +
        `<path d="M300 610V320a100 100 0 0 1 200 0V610Z" fill="${accent}"/>` +
        `<path d="M500 610L760 800H360L300 610Z" fill="${ink}" opacity=".12"/>` +
        rect(105, 575, 115, 80, warm) +
        leaf(155, 500, -15, accent)
      break
    case 2: // Open notebook, pencil, a cup of coffee.
      art =
        rect(0, 0, 800, 800, mist) +
        `<g transform="rotate(-9 400 400)">${rect(130, 145, 520, 485, cream, 8)}${line("M390 170V605", "#d7d1c8", 2)}${Array.from({ length: 8 }, (_, i) => line(`M160 ${220 + i * 45}H350M425 ${220 + i * 45}H610`, sage, 2)).join("")}</g>` +
        circle(630, 585, 98, ink) +
        circle(630, 585, 83, cream) +
        circle(630, 585, 63, "#8d6248") +
        line("M708 552Q790 540 755 611Q747 625 715 622", cream, 21) +
        `<g transform="rotate(24 160 520)">${rect(150, 365, 17, 270, accent, 4)}<path d="M150 635L159 665L167 635Z" fill="${warm}"/></g>`
      break
    case 3: // A sculpted coastal landscape.
      art =
        rect(0, 0, 800, 800, "#dbe5e4") +
        circle(600, 180, 82, "#e6c49d") +
        `<path d="M0 395Q220 250 450 405T800 350V800H0Z" fill="${sage}"/><path d="M0 520Q250 390 410 570T800 460V800H0Z" fill="${accent}"/><path d="M0 650Q280 490 800 680V800H0Z" fill="${ink}" opacity=".7"/>` +
        line("M80 690Q300 620 540 710", cream, 2)
      break
    case 4: // Mid-century cut paper, with contrasting texture lines.
      art =
        rect(0, 0, 800, 800, cream) +
        circle(280, 300, 210, accent) +
        rect(400, 90, 200, 540, warm) +
        `<path d="M100 590A270 270 0 01540 590Z" fill="${sage}"/>` +
        rect(540, 470, 180, 230, ink) +
        Array.from({ length: 9 }, (_, i) =>
          line(`M100 ${90 + i * 16}H650`, ink, 1),
        ).join("")
      break
    case 5: // City windows at golden hour.
      art =
        rect(0, 0, 800, 800, "#eee2d0") +
        circle(620, 140, 85, warm) +
        rect(80, 270, 220, 530, accent) +
        rect(330, 150, 200, 650, sage) +
        rect(560, 390, 170, 410, ink) +
        Array.from({ length: 16 }, (_, i) =>
          rect(
            113 + (i % 3) * 56,
            315 + Math.floor(i / 3) * 78,
            28,
            45,
            cream,
            14,
          ),
        ).join("") +
        Array.from({ length: 12 }, (_, i) =>
          rect(
            363 + (i % 2) * 80,
            195 + Math.floor(i / 2) * 85,
            40,
            55,
            cream,
            20,
          ),
        ).join("")
      break
    case 6: // Books and a small lamp.
      art =
        rect(0, 0, 800, 800, cream) +
        rect(0, 650, 800, 150, warm) +
        rect(120, 590, 340, 48, accent, 5) +
        rect(155, 535, 270, 46, sage, 4) +
        rect(130, 480, 310, 46, ink, 4) +
        line("M565 650V385", ink, 12) +
        `<path d="M475 390L530 225H610L670 390Z" fill="${accent}"/>` +
        `<ellipse cx="570" cy="657" rx="80" ry="12" fill="${ink}"/>` +
        circle(250, 340, 95, mist)
      break
    case 7: // Gallery wall and an organic vessel.
      art =
        rect(0, 0, 800, 800, "#e9dfd0") +
        rect(110, 100, 365, 450, ink) +
        rect(125, 115, 335, 420, cream) +
        circle(290, 275, 105, warm) +
        `<path d="M150 490Q230 290 440 490Z" fill="${accent}"/>` +
        rect(0, 675, 800, 125, sage) +
        `<path d="M530 420H625L611 495Q715 570 661 676H486Q437 570 545 495Z" fill="${warm}"/>` +
        line("M545 470H611", cream, 2)
      break
    case 8: // Botanical study, drawn as a specimen rather than stock photography.
      art =
        rect(0, 0, 800, 800, paper) +
        line("M370 700Q430 430 380 130", accent, 6) +
        [0, 1, 2, 3]
          .map(
            (i) =>
              leaf(350 - i * 7, 225 + i * 100, -45, i % 2 ? accent : sage) +
              leaf(440 + i * 5, 265 + i * 100, 45, i % 2 ? sage : accent),
          )
          .join("") +
        line("M120 710H680", ink, 2) +
        circle(650, 130, 36, warm)
      break
    default: // Ribbon of ink and a terracotta disc.
      art =
        rect(0, 0, 800, 800, cream) +
        circle(540, 290, 180, warm) +
        `<path d="M80 800V380A210 210 0 01420 215Q575 265 520 445T530 800" fill="none" stroke="${accent}" stroke-width="115"/>` +
        Array.from({ length: 7 }, (_, i) =>
          line(`M${115 + i * 22} 0V175`, ink, 2),
        ).join("") +
        circle(150, 600, 70, sage)
      break
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">${art}</svg>`
}
