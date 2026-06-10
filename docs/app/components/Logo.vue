<script setup lang="ts">
 /**
 * The full-color nostics logo as inline SVG.
 *
 * The gradient antennas keep their brand colors; the monochrome glyph uses
 * `currentColor` so it follows the active color mode (light text on the dark
 * theme, dark text on the light theme) instead of the OS `prefers-color-scheme`.
 *
 * Size it from the outside with a class, e.g. `:logo{class="h-20"}`.
 */
</script>

<template>
  <svg
    viewBox="0 0 799 530"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="nostics"
  >
    <path
      d="M110 31C53 31 16 56 16 108C16 143 26 172 43 199"
      stroke="url(#logo-stem-a)"
      stroke-width="31"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M354 31C417 31 450 57 450 111C450 143 441 174 422 200"
      stroke="url(#logo-stem-b)"
      stroke-width="31"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M140 0H109C91.3269 0 77 14.3269 77 32C77 49.6731 91.3269 64 109 64H140C157.673 64 172 49.6731 172 32C172 14.3269 157.673 0 140 0Z"
      fill="url(#logo-tip-a)"
    />
    <path
      d="M357 0H328C310.327 0 296 14.3269 296 32C296 49.6731 310.327 64 328 64H357C374.673 64 389 49.6731 389 32C389 14.3269 374.673 0 357 0Z"
      fill="url(#logo-tip-b)"
    />
    <path
      d="M39 183L88 233"
      stroke="currentColor"
      stroke-width="52"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M425 183L376 233"
      stroke="currentColor"
      stroke-width="52"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M82 497V319C82 230 151 165 242 165C333 165 388 232 388 319V376C388 452 443 504 519 504H621M621 504C711 504 773 437 773 343C773 249 755 165 621 165C487 165 464 263 464 346C464 438 531 504 621 504Z"
      stroke="currentColor"
      stroke-width="52"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <defs>
      <linearGradient
        id="logo-stem-a"
        x1="63"
        y1="31"
        x2="63"
        y2="199"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#D7E2FF" />
        <stop offset="1" stop-color="#818899" />
      </linearGradient>
      <linearGradient
        id="logo-stem-b"
        x1="402"
        y1="31"
        x2="402"
        y2="200"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#D7E2FF" />
        <stop offset="1" stop-color="#818899" />
      </linearGradient>
      <linearGradient
        id="logo-tip-a"
        x1="77"
        y1="0"
        x2="136.313"
        y2="88.0421"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#0C3A78" />
        <stop offset="1" stop-color="#071E43" />
      </linearGradient>
      <linearGradient
        id="logo-tip-b"
        x1="296"
        y1="0"
        x2="355.777"
        y2="86.8632"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#0C3A78" />
        <stop offset="1" stop-color="#071E43" />
      </linearGradient>
    </defs>
  </svg>
</template>
