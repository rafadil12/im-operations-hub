type IconProps = {
  className?: string;
};

/** SVG Repo: https://www.svgrepo.com/svg/510924/import */
export function ImportIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={["size-4 shrink-0", className].filter(Boolean).join(" ")}
    >
      <path
        d="M12 4v10m0 0 3-3m-3 3-3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16.286c0 2.623 0 3.935-.819 4.75C18.362 21.85 17.044 21.85 14.409 21.85H9.591c-2.635 0-3.953 0-4.772-.814C4 20.221 4 18.91 4 16.286"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** SVG Repo: https://www.svgrepo.com/svg/510915/export */
export function ExportIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={["size-4 shrink-0", className].filter(Boolean).join(" ")}
    >
      <path
        d="M12 14V4m0 0 3 3m-3-3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16.286c0 2.623 0 3.935-.819 4.75C18.362 21.85 17.044 21.85 14.409 21.85H9.591c-2.635 0-3.953 0-4.772-.814C4 20.221 4 18.91 4 16.286"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** SVG Repo: https://www.svgrepo.com/svg/457214/notes */
export function NotesIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="-0.5 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={["size-4 shrink-0", className].filter(Boolean).join(" ")}
    >
      <path
        d="M18.6375 9.04176L13.3875 14.2418C13.3075 14.3218 13.1876 14.3718 13.0676 14.3718H10.1075V11.3118C10.1075 11.1918 10.1575 11.0818 10.2375 11.0018L15.4376 5.84176"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.7076 11.9818V21.6618C18.7076 21.9018 18.5176 22.0918 18.2776 22.0918H2.84756C2.60756 22.0918 2.41754 21.9018 2.41754 21.6618V6.23176C2.41754 5.99176 2.60756 5.80176 2.84756 5.80176H12.4875"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.3863 2.90824L16.859 4.43558L20.0551 7.63167L21.5824 6.10433L18.3863 2.90824Z"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
