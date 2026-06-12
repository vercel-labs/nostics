<script lang="ts" setup>
// Custom landing OG image (overrides Docus' default).
//
// Why not reuse the app Logo component: the zeroRuntime renderer (takumi)
// drops `currentColor` and <style>-based theming, so the logo's monochrome
// paths vanish on the dark background. Here every path carries an explicit
// color. SVG <linearGradient> defs must use default objectBoundingBox
// units (0..1): takumi misreads userSpaceOnUse coordinates as bbox
// fractions and clamps the fill to the last stop (near-black earpieces).

const { title } = defineProps<{ title?: string; description?: string }>()

const { name: siteName } = useSiteConfig()

const logoFill = '#FAFAFA'
const slogan = title || 'Errors worth reading'
const features = [
  'Stable, typed error codes',
  'Actionable fixes & doc links',
  'Console, file & HTTP reporters',
  'Stripped from production builds',
]
</script>

<template>
  <div class="w-full h-full flex flex-col justify-between bg-[#0a0a0a] px-[80px] py-[72px]">
    <!-- Radial glow top-right: wide soft layer -->
    <div
      class="absolute top-0 right-0 w-[700px] h-[700px] bg-[radial-gradient(circle_at_top_right,rgba(120,160,255,0.10)_0%,rgba(120,160,255,0.03)_40%,transparent_70%)]"
    />
    <!-- Radial glow top-right: tight bright core -->
    <div
      class="absolute top-0 right-0 w-[340px] h-[340px] bg-[radial-gradient(circle_at_top_right,rgba(160,190,255,0.18)_0%,rgba(160,190,255,0.06)_40%,transparent_65%)]"
    />

    <!-- Logo (full nostics wordmark + glyph), colors baked for takumi -->
    <div class="flex">
      <svg
        width="300"
        height="100"
        viewBox="0 0 2090 695"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M111 31C14 35 14 55 14 104C14 146 21 192 35 236"
          stroke="#D8E4FF"
          stroke-width="28"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M367 31C463 31 463 55 463 104C463 146 456 192 442 236"
          stroke="#D8E4FF"
          stroke-width="28"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M35 232C48 283 78 318 113 345"
          :stroke="logoFill"
          stroke-width="52"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M443 232C430 283 404 320 369 345"
          :stroke="logoFill"
          stroke-width="52"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M90 636V440C90 358 156 293 243 293C331 293 397 358 397 440V529C397 592 446 636 509 636H645"
          :stroke="logoFill"
          stroke-width="52"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M665 637C751.709 637 822 566.709 822 480C822 393.291 751.709 323 665 323C578.291 323 508 393.291 508 480C508 566.709 578.291 637 665 637Z"
          :stroke="logoFill"
          stroke-width="52"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M144 0H110C93.9837 0 81 12.9837 81 29V34C81 50.0163 93.9837 63 110 63H144C160.016 63 173 50.0163 173 34V29C173 12.9837 160.016 0 144 0Z"
          fill="url(#og-logo-eye-a)"
        />
        <path
          d="M367 0H334C317.984 0 305 12.9837 305 29V34C305 50.0163 317.984 63 334 63H367C383.016 63 396 50.0163 396 34V29C396 12.9837 383.016 0 367 0Z"
          fill="url(#og-logo-eye-b)"
        />
        <path
          transform="translate(12.5 75) scale(1.0398)"
          :fill="logoFill"
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M1984 241C1982.74 235.702 1980.5 227.299 1973.5 224C1966.5 220.701 1849.19 223.678 1824 224C1798.93 224.299 1775.22 241.705 1759 259C1745.26 273.647 1737.45 296.252 1736 316C1734.92 330.752 1737.78 346.157 1743 360C1749.08 376.133 1760.28 390.616 1774 401C1786.96 410.812 1803.59 418.939 1820 420C1852.15 422.09 1894.18 410.549 1923 428C1928.5 431.33 1934.33 436.83 1938 441C1949.6 454.186 1952.45 477.402 1945 493C1943.17 496.83 1939.67 503.33 1937 507C1929.65 517.106 1917.15 523.912 1905 526C1900.17 526.83 1896.21 526.91 1889 527C1876.17 527.17 1845 527.33 1828 527C1811 526.67 1797.5 526.83 1787 525C1762.2 520.678 1745.31 499.045 1725 486C1715.91 480.178 1701.55 480.34 1692 485C1684.83 488.5 1671.17 497.67 1661 503C1650.83 508.33 1641.17 513.17 1631 517C1612.45 523.984 1592.87 528.603 1573 529C1556.7 529.326 1539.39 526.356 1524 521C1491.82 509.798 1465.71 483.885 1452 453C1438.08 421.647 1439.14 384.492 1448 352C1451.91 337.648 1459.38 324.976 1468 313C1501.07 267.17 1574.52 251.555 1625 275C1639.42 281.696 1656.86 300.035 1674 289C1679.52 285.448 1685.32 276.899 1684 270C1683.33 266.5 1682.17 260.17 1679 256C1675.83 251.83 1671.83 249.17 1665 245C1658.17 240.83 1646.17 234.5 1638 231C1609.82 218.929 1579.18 219.147 1549 220C1524.65 220.704 1500.06 231.659 1479 243C1451.89 257.596 1428.89 282.682 1415 310C1389.08 360.981 1387.36 430.355 1415 481C1418.88 488.104 1433.56 501.463 1431 510C1427.9 520.359 1416.4 527.442 1406 528C1391.64 528.77 1378.99 520.507 1369 511C1357.65 500.203 1351.13 479.319 1351 464C1350.67 424.83 1351.5 280.33 1351 242C1350.89 233.728 1340.22 223.167 1332 223C1297.83 222.33 1169 223.33 1136 223C1134.73 222.99 1134.03 222.27 1134 221C1133.67 206.33 1132.83 150.83 1134 135C1134.38 129.88 1139.5 128.33 1141 126C1147.2 116.352 1145.99 97.861 1139 88.9999C1128.24 75.3512 1101.15 73.4221 1091 88.9999C1088.83 92.3299 1086 98.8299 1085 103C1083.4 109.672 1084.84 118.951 1088 125C1089.83 128.5 1095.52 129.26 1096 135C1097.33 151 1096.33 206.33 1096 221C1095.97 222.27 1095.27 222.99 1094 223C1060.83 223.33 931.67 222.67 897 223C868.133 223.287 837.774 245.811 823 269C810.263 288.992 805.816 311.633 808 335C809.199 347.831 813.989 360.678 820 372C834.988 400.227 868.361 419.79 900 421C924.385 421.938 956.332 414.263 978 428C983 431.17 989.5 437.17 993 441C1003.02 451.966 1005.6 469.942 1003 484C1001.83 490.33 997.83 497.17 996 501C968.706 558.122 805.968 551.423 770 499C766 493.17 762.5 483.17 761 479L732 523C732 523 742.5 535 748 540C759.925 550.841 773.942 559.231 789 565C850.806 588.681 1034.47 599.762 1047 492C1048.84 476.249 1049.93 457.057 1044 442C1041.83 436.5 1037 425.5 1034 420C1019.26 392.989 985.624 376.568 956 375C943.5 374.33 916.67 376 907 376C898.433 376 889.906 373.096 882 370C861.566 362.02 849.752 335.856 853 315C856.472 292.703 875.752 271.026 899 269C904.67 268.5 912.74 268 924 268C955.67 268 1061.17 268.5 1089 269C1090.27 269.02 1090.99 269.73 1091 271C1091.33 302.5 1090.67 425.33 1091 458C1091.04 462.15 1092.83 465.17 1093 467C1093.09 468 1091.83 468.01 1092 469C1094.82 485.107 1100.23 499.604 1108 514C1119.24 534.828 1139.77 551.352 1161 561C1183.54 571.247 1208.26 575.698 1233 573C1259.59 570.1 1285.24 557.479 1306 541C1311.67 536.5 1318.67 526.5 1323 526C1327.33 525.5 1328.5 534 1332 538C1335.5 542 1339.67 546.33 1344 550C1364.01 566.96 1389.67 576.277 1416 573C1428.67 571.424 1441 565.871 1451 558C1456.5 553.67 1460 542.17 1467 542C1474 541.83 1484.67 553 1493 557C1507.18 563.811 1522.59 568.077 1538 571C1559.25 575.03 1582.69 574.477 1604 571C1627.12 567.227 1650.38 559.115 1671 548C1679.67 543.33 1699 530.83 1706 528C1709.18 526.71 1710.18 529.05 1713 531C1719.5 535.5 1737 549.67 1745 555C1755.47 561.986 1767.9 565.887 1780 569C1785.17 570.33 1786.53 570.96 1792 571C1836.69 571.34 1890.68 580.371 1933 564C1956.45 554.93 1976.93 534.368 1986 511C1989.17 502.83 1991.83 491.33 1993 483C1996.02 461.474 1990.17 440.836 1980 422C1972.25 407.637 1958.5 394.505 1944 387C1931.52 380.542 1917.08 375.703 1903 375C1871.07 373.425 1833.89 383.653 1805 367C1790.64 358.723 1782.18 341.036 1781 325C1779.85 309.264 1787.98 291.948 1800 282C1807.69 275.638 1817.75 269.329 1828 269C1853.83 268.17 1944.5 268.67 1969 268C1980.55 267.694 1986.16 250.116 1984 241ZM1140 269C1160.67 268.5 1234.83 268 1262 268C1280.46 268 1295.83 268.5 1303 269C1308.14 269.364 1311.47 457.464 1297 484C1290.79 495.382 1281.33 504.358 1271 512C1259.18 520.746 1243.59 526.637 1229 528C1210.09 529.767 1192.56 527.608 1176 518C1154.84 505.721 1137.59 483.259 1137 458C1136.17 422.83 1137.5 302.5 1138 271C1138.02 269.73 1138.73 269.03 1140 269ZM1324 124C1320.33 124.83 1314.17 127.17 1311 129C1301.82 134.3 1298.28 147.165 1299 157C1299.64 165.662 1304.81 173.317 1312 178C1322.33 184.729 1334.91 183.157 1345 177C1353.78 171.641 1358.28 158.83 1357 149C1356.07 141.892 1351.93 134.147 1346 130C1339.68 125.579 1331.71 122.257 1324 124Z"
        />
        <defs>
          <!-- objectBoundingBox units (0..1): takumi misreads userSpaceOnUse
               coords as bbox fractions, clamping the fill to the last stop. -->
          <linearGradient id="og-logo-eye-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3EC5FF" />
            <stop offset="1" stop-color="#2819C5" />
          </linearGradient>
          <linearGradient id="og-logo-eye-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3EC5FF" />
            <stop offset="1" stop-color="#2819C5" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <!-- Slogan -->
    <div class="flex">
      <h1 class="m-0 text-[72px] font-bold text-white leading-[1.05] tracking-[-0.02em]">
        {{ slogan }}
      </h1>
    </div>

    <!-- Feature list -->
    <div class="flex flex-col">
      <div v-for="feature in features" :key="feature" class="flex items-center mb-[14px]">
        <div class="w-[12px] h-[12px] rounded-full bg-emerald-400 mr-[20px]" />
        <span class="text-[28px] text-neutral-300 leading-[1.2]">{{ feature }}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center">
      <span class="text-[24px] font-medium text-emerald-400">{{ siteName }}</span>
      <span class="text-[24px] text-neutral-600 mx-[14px]">/</span>
      <span class="text-[24px] text-neutral-400">nostics.dev</span>
    </div>
  </div>
</template>
