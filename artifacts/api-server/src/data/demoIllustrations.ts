/** Safe, fictional illustrations: no photographs of real people or alleged offenders. */
const subjects: Record<string, string> = {
  bicycle: '<g fill="none" stroke="#345e6a" stroke-width="7"><circle cx="180" cy="210" r="40"/><circle cx="330" cy="210" r="40"/><path d="M180 210l55-80 50 80h-105l35-60h80l35 60m-50-100h40m-100 20h-30"/></g>',
  glass: '<path d="M140 220l60-65 20 60zM235 205l35-85 35 75zM300 225l65-45-10 60z" fill="#8dc2c9" stroke="#345e6a" stroke-width="3"/>',
  walkway: '<path d="M210 270l30-185h55l70 185" fill="#d4c8b4"/><g stroke="#345e6a" stroke-width="5"><path d="M130 110v140m240-140v140"/><path d="M110 110h40m200 0h40"/></g><path d="M125 110h30v20h-30m230-20h30v20h-30" fill="#e4ba67"/>',
  sign: '<path d="M250 150v105" stroke="#345e6a" stroke-width="8"/><rect x="160" y="95" width="185" height="85" rx="8" fill="#ded6bc" stroke="#345e6a" stroke-width="5"/><path d="M185 120h70m-50 25h95" stroke="#a27e61" stroke-width="4"/>',
};
export function demoIllustration(slug: string): string | undefined {
  const subject = subjects[slug];
  if (!subject) return undefined;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="330" viewBox="0 0 520 330"><rect width="520" height="330" fill="#edf2ed"/><path d="M0 265h520v65H0" fill="#c4d5cc"/><path d="M0 50h520" stroke="#d2ded6" stroke-width="40"/>${subject}<rect y="285" width="520" height="45" fill="#1f4352"/><text x="260" y="313" font-family="Arial,sans-serif" font-size="17" fill="#fff" text-anchor="middle">REPORT ATTACHMENT</text></svg>`;
}