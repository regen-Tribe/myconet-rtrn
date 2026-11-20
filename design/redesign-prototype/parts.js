/* Shared by app.html: the icon set and the cream-on-cobalt drawings (copied from index.html). */
const I = {
  menu:'<path d="M4 7h16M4 12h16M4 17h10"/>',
  bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9"/><path d="M10.3 20.5a2 2 0 0 0 3.4 0"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  right:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  left:'<path d="M19 12H5M11 18l-6-6 6-6"/>',
  home:'<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z"/>',
  tasks:'<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  board:'<rect x="3.5" y="4" width="4.5" height="16" rx="2"/><rect x="9.75" y="4" width="4.5" height="11" rx="2"/><rect x="16" y="4" width="4.5" height="13.5" rx="2"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  grid:'<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  circles:'<circle cx="8.5" cy="9" r="4.5"/><circle cx="15.5" cy="9" r="4.5"/><circle cx="12" cy="15" r="4.5"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  pin:'<path d="M12 21.5s7-6 7-11.5a7 7 0 0 0-14 0c0 5.5 7 11.5 7 11.5z"/><circle cx="12" cy="10" r="2.5"/>',
  handshake:'<path d="m11 17 2 2a1.5 1.5 0 0 0 2.1-2.1"/><path d="m14 14 2.5 2.5a1.5 1.5 0 0 0 2.1-2.1L15 10.8a3 3 0 0 0-4.2 0l-.9.9a1.5 1.5 0 1 1-2.1-2.1L10.6 7a4 4 0 0 1 5.2-.4l.5.4h4.2"/><path d="M21.5 15.5 19 13M3 6h4.5l3.5 3.5M2.5 14l6.5 6.5a1.5 1.5 0 0 0 2.1-2.1"/>',
  chat:'<path d="M20.5 15a2 2 0 0 1-2 2H8l-4.5 4V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 12.5h5"/>',
  scale:'<path d="M12 3.5V20M7 20.5h10M4 7.5h16"/><path d="M6.5 7.5 3.5 14a3 3 0 0 0 6 0zM17.5 7.5l-3 6.5a3 3 0 0 0 6 0z"/>',
  inbox:'<path d="M3.5 13.5 6 5h12l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z"/><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5"/>',
  box:'<path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  shield:'<path d="M12 21.5s8-3.5 8-10V5.5l-8-3-8 3v6c0 6.5 8 10 8 10z"/>',
  spark:'<path d="M12 3.5 13.9 9 19.5 11 13.9 13 12 18.5 10.1 13 4.5 11 10.1 9z"/><path d="M19 3.5v3M17.5 5h3"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  phone:'<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/>',
  bed:'<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11.5" r="2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  id:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6 15.5a3 3 0 0 1 6 0M14.5 10h4M14.5 13.5h3"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  sprout:'<path d="M12 21v-9"/><path d="M12 12c0-4 3-6.5 7.5-6.5 0 4.5-3 6.5-7.5 6.5z"/><path d="M12 14.5C12 11 9.5 9 5 9c0 4 2.5 5.5 7 5.5z"/>',
  alert:'<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.1"/>',
  unlock:'<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2"/>',
  flag:'<path d="M5 21V4M5 4.5h11l-2 4 2 4H5"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  party:'<path d="m4 20 4.5-12.5 8 8z"/><path d="M13.5 4.5c.5 1.5 0 2.5-1 3M19.5 10.5c-1.5-.5-2.5 0-3 1M17 3.5v2M20.5 7h-2M15 7.5l1-1"/>',
  pencil:'<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="m14.5 5.5 3 3"/>',
  trash:'<path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 13.5h10l1-13.5"/><path d="M10 10.5v6M14 10.5v6"/>',
  undo:'<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4.5h4.5"/>',
  upload:'<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  share:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
  settings:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  logout:'<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
  vote:'<path d="M4 13h16v7.5H4z"/><path d="M8 13V5h8v8"/><path d="m10 9 1.5 1.5L14 8"/>',
  badge:'<circle cx="12" cy="9" r="5.5"/><path d="m9 13.8-1.5 7 4.5-2.5 4.5 2.5-1.5-7"/>',
  star:'<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  gift:'<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10 4 6.5 4.5 7 7c.3 1 2.5 1 5 1zM12 8c2-4 5.5-3.5 5-1-.3 1-2.5 1-5 1z"/>',
  hand:'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0v7"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.5-2.7L4 15.5a1.5 1.5 0 0 1 2.3-1.9L8 15.5"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  plane:'<path d="M21 3.5 3 11l7 3 3 7z"/><path d="m10 14 5-5"/>',
  file:'<path d="M14 3.5H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z"/><path d="M14 3.5V8h4.5M8.5 13h7M8.5 16.5h5"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  brain:'<path d="M12 4.5a3 3 0 0 0-5 2 3 3 0 0 0-2.5 5 3 3 0 0 0 1 5 3 3 0 0 0 4 2.5 2.5 2.5 0 0 0 2.5-1z"/><path d="M12 4.5a3 3 0 0 1 5 2 3 3 0 0 1 2.5 5 3 3 0 0 1-1 5 3 3 0 0 1-4 2.5 2.5 2.5 0 0 1-2.5-1zM12 4.5V18"/>',
  map:'<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  camera:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  laptop:'<rect x="4.5" y="5" width="15" height="10.5" rx="1.5"/><path d="M2.5 19h19"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"/>',
  heart:'<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>',
  megaphone:'<path d="M4 10v4h3l8 4.5V5.5L7 10z"/><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5M7 14l1.5 5.5"/>',
  wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  building:'<path d="M3.5 20.5h17M5 20.5V10M19 20.5V10M9 20.5V10M15 20.5V10M3 9.5 12 4l9 5.5z"/>'
};
const COB = '#1F3FB8', CRM = '#F3EAD7';
const INK = `fill="none" stroke="${CRM}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"`;

/* Myco: the MyCoNet mushroom, walking to the meeting with a coffee and a seedling */
function myco({word=true, sub=true}={}){
  return `<svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid meet" ${INK}>
    ${word ? `<text x="150" y="58" text-anchor="middle" fill="${CRM}" stroke="none" font-family="Inter Tight, sans-serif" font-weight="800" font-size="128" letter-spacing="-6">MYCO</text>` : ''}
    <!-- legs -->
    <path d="M131 286 C127 314 118 334 103 352"/><path d="M103 352 C96 356 88 357 83 352"/>
    <path d="M168 286 C176 311 189 331 205 347"/><path d="M205 347 C212 352 221 351 225 345"/>
    <!-- stem body -->
    <path fill="${COB}" d="M123 138 C118 190 112 240 117 286 C137 295 168 295 186 285 C189 240 186 190 179 139 Z"/>
    <!-- cap -->
    <path fill="${COB}" d="M58 131 C50 84 104 38 162 40 C226 42 268 90 252 128 C228 143 86 148 58 131 Z"/>
    <path d="M100 82 C110 72 128 78 124 89 C120 99 100 96 100 82 Z"/>
    <path d="M168 60 C176 54 189 59 186 67 C183 75 169 72 168 60 Z"/>
    <path d="M206 92 C216 86 229 93 225 102 C220 110 205 105 206 92 Z"/>
    <path d="M86 139 l3 9 M106 142 l2 9 M200 142 l-2 9 M222 138 l-3 9"/>
    <!-- shades (the one solid fill) + smug mouth -->
    <path fill="${CRM}" d="M124 162 C132 159 142 159 148 161 C149 168 147 175 140 177 C132 179 126 175 124 170 Z"/>
    <path fill="${CRM}" d="M156 161 C163 158 173 158 180 161 C181 168 178 175 171 176 C163 177 157 173 156 168 Z"/>
    <path d="M148 164 C151 161 154 161 156 164 M124 164 L117 160 M180 163 L186 159"/>
    <path d="M147 190 C154 189 156 193 152 195 C157 196 157 201 149 201"/>
    <!-- potted seedling held at the hip (pot and leaves hide what's behind them) -->
    <path d="M93 236 C92 226 91 216 90 206"/>
    <path fill="${COB}" d="M90 214 C74 196 56 198 50 206 C62 220 80 222 90 214 Z"/><path d="M86 213 L58 205" stroke-width="3"/>
    <path fill="${COB}" d="M92 210 C98 190 116 184 127 188 C123 204 107 214 92 210 Z"/><path d="M96 208 L120 192" stroke-width="3"/>
    <path fill="${COB}" d="M63 246 L70 283 C84 289 104 289 118 283 L125 246 Z"/>
    <path fill="${COB}" d="M59 237 C82 232 106 232 129 237 L127 248 C106 244 82 244 61 248 Z"/>
    <path d="M78 262 C88 266 100 266 110 262" stroke-width="3"/>
    <path d="M119 212 C104 223 101 236 106 244"/>
    <path fill="${COB}" d="M99 245 C103 237 117 237 121 245 C123 253 111 258 103 256 C97 254 96 249 99 245 Z"/>
    <path d="M106 248 l3 6 M113 246 l3 6" stroke-width="3"/>
    <!-- right arm + takeaway coffee -->
    <path d="M185 206 C206 211 220 200 224 182"/>
    <path fill="${COB}" d="M224 148 L231 191 C236 196 252 196 257 190 L264 147 Z"/>
    <path fill="${COB}" d="M219 148 C226 139 260 138 268 146 C262 150 226 151 219 148 Z"/>
    <path d="M227 162 L261 161"/>
    <path fill="${COB}" d="M219 170 C214 174 215 184 222 186 C229 188 237 185 238 178 C238 172 231 168 219 170 Z"/>
    <path d="M228 173 C232 174 235 173 237 171 M228 180 C232 181 235 180 237 178" stroke-width="3"/>
    <path d="M238 131 C234 125 242 120 238 113 M251 129 C247 123 255 118 251 111" stroke-width="3.5"/>
    <!-- motion -->
    <path d="M58 326 h18 M64 338 h12" stroke-width="3.5"/>
    ${sub ? `<g fill="${CRM}" stroke="none" font-family="Inter, sans-serif" font-weight="600" font-size="11" letter-spacing="2.2">
      <text x="18" y="372">PROJECTS</text><text x="282" y="372" text-anchor="end">CIRCLES</text></g>` : ''}
  </svg>`;
}

/* A seed packet that knows it's cool, a sprout coming out the top */
function seeds(){
  return `<svg viewBox="0 0 320 210" preserveAspectRatio="xMidYMid meet" ${INK} stroke-width="4">
    <text x="160" y="60" text-anchor="middle" fill="${CRM}" stroke="none" font-family="Inter Tight, sans-serif" font-weight="800" font-size="96" letter-spacing="-4">SEEDS</text>
    <!-- sprout -->
    <path d="M163 70 C161 54 166 40 173 30"/>
    <path fill="${COB}" d="M171 34 C186 15 207 16 216 22 C206 37 186 42 171 34 Z"/><path d="M176 33 L208 23" stroke-width="3"/>
    <path fill="${COB}" d="M168 44 C151 29 132 30 125 36 C137 49 156 50 168 44 Z"/><path d="M163 43 L133 36" stroke-width="3"/>
    <!-- packet -->
    <path fill="${COB}" d="M117 73 L126 66 L134 73 L142 66 L150 73 L158 66 L166 73 L174 66 L182 73 L190 66 L198 72 L207 64 C212 105 214 148 219 186 C187 191 156 193 126 195 C121 154 119 112 117 73 Z"/>
    <path d="M120 88 C150 85 180 82 209 78" stroke-width="3"/>
    <!-- shades + smirk -->
    <path fill="${CRM}" d="M133 112 C140 109 149 109 155 111 C156 117 154 123 148 124 C141 126 135 122 133 117 Z" stroke-width="3"/>
    <path fill="${CRM}" d="M163 110 C170 107 179 107 185 110 C186 116 183 122 177 123 C170 124 164 120 163 115 Z" stroke-width="3"/>
    <path d="M155 113 C158 110 161 110 163 113" stroke-width="3"/>
    <path d="M156 136 C162 135 164 139 160 141 C165 142 165 147 157 147" stroke-width="3"/>
    <path d="M131 166 C158 163 186 160 214 157 M133 178 C158 175 185 173 215 170" stroke-width="3"/>
    <!-- seeds tumbling out -->
    <path d="M86 142 C93 136 101 142 97 149 C92 155 82 150 86 142 Z" stroke-width="3"/>
    <path d="M64 167 C70 159 80 163 78 171 C75 179 63 176 64 167 Z" stroke-width="3"/>
    <path d="M98 182 C104 176 113 180 110 187 C106 194 96 190 98 182 Z" stroke-width="3"/>
    <path d="M70 136 l-8 -4 M52 160 l-9 -2 M84 192 l-9 3" stroke-width="3"/>
    <!-- a little sparkle of pride -->
    <path d="M238 92 v14 M231 99 h14 M252 70 v8 M248 74 h8" stroke-width="3"/>
  </svg>`;
}

const SCENES = {
  seeds: ()=>seeds(),
  myco:  ()=>myco({word:false, sub:false}),
  poster:()=>myco({word:true, sub:true})
};
