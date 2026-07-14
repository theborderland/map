import { useEffect, useRef, useState } from "react";
import { AVAILABLE_ICONS, getIconPath } from "../../utils/Icons";

interface Props {
    value: string;
    onChange: (iconName: string) => void;
}

/** Scrollable grid of PNG icon thumbnails. Click one to select it. */
export default function IconPicker({ value, onChange }: Props) {
    const [search, setSearch] = useState("");
    const selectedRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        selectedRef.current?.scrollIntoView({
            block: "center",
            behavior: "auto",
        });
    }, []);

    const filtered = AVAILABLE_ICONS.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="form-field">
            <label className="form-label">Icon</label>

            <wa-input
                value={search}
                placeholder="Search icons…"
                size="s"
                onInput={(e: Event) => setSearch((e.target as HTMLInputElement).value)}
            />

            <div className="form-icon-picker">
                {filtered.length === 0 && (
                    <p className="item-meta" style={{ gridColumn: "1 / -1", padding: "0.5rem" }}>
                        No icons match "{search}".
                    </p>
                )}

                {filtered.map((name) => {
                    const selected = value === name;
                    return (
                        <button
                            id={"tooltip-" + name}
                            key={name}
                            ref={selected ? selectedRef : null}
                            onClick={() => onChange(name)}
                            className={selected ? "selected" : ""}
                        >
                            <img
                                src={getIconPath(name)}
                                width={36}
                                height={36}
                            />
                            <wa-tooltip for={"tooltip-" + name} placement="top">{name}</wa-tooltip>
                        </button>

                    );
                })}
            </div>
        </div>
    );
}