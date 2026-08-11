/// <reference types="astro/client" />

/**
 * Rozszerzenia globalnego obiektu `window` używane przez Alpine.js i
 * komponenty Astro (assign w `<script define:vars>`).
 */
declare global {
  interface Window {
    /**
     * Alpine.js instance — dostępne po załadowaniu `alpinejs`.
     * Typ `any` bo paczka nie eksportuje publicznego interfejsu Alpine.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Alpine: any;

    /** Alpine component factory dla listy przepisów (index.astro). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recipeList: () => any;

    /** Alpine component factory dla planera jadłospisu (plan.astro). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plannerApp: () => any;

    /** Alpine component factory dla strony listy zakupów (lista-zakupow.astro). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shoppingListPage: () => any;
  }
}

export {};
