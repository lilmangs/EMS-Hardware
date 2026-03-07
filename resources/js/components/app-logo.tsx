
export default function AppLogo() {

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md bg-transparent">
                <img
                    src="/public/build/ems-logo.png"
                    alt="EM's Hardware"
                    className="h-8 w-8 object-contain"
                />
            </div>
            <div className="ml-2 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-orange-600">
                    EM&apos;s Hardware
                </span>
            </div>
        </>
    );
}
