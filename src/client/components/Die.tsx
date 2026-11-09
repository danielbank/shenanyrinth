import * as m from 'motion/react-m';
import styles from './Die.module.css';

const SHAPE: Record<number, string | undefined> = {
  6: styles.d6,
  8: styles.d8,
  10: styles.d10,
  12: styles.d12,
};

/** A badge whose shape shows the face count, showing the rolled number. */
export function Die({
  faces,
  value,
  rolling = false,
  glow,
}: {
  faces: number;
  value: number;
  rolling?: boolean;
  glow?: string;
}) {
  return (
    <m.span
      className={`${styles.die} ${SHAPE[faces] ?? styles.d6}`}
      style={glow ? { background: glow } : undefined}
      aria-label={`d${faces} showing ${value}`}
      animate={rolling ? { rotate: [0, -25, 20, -15, 10, 0], opacity: [1, 0.4, 1, 0.4, 1] } : {}}
      transition={{ duration: 0.6 }}
    >
      {value}
    </m.span>
  );
}
