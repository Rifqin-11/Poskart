import Image from "next/image";
import styles from "./hero-retro.module.css";
import { retroGeometry } from "./hero-retro-geometry";

export function HeroRetroScene() {
  return (
    <div className={styles.scene} role="img" aria-label="TV retro kayu menampilkan halaman kamera Poskart dan mengeluarkan photostrip dari celah di bawah kenop">
      <div data-retro-tv className={styles.tv}>
        <Image src="/landing/hero/tv-white.webp" width={1536} height={1024} alt="TV CRT vintage dengan kabinet kayu dan panel hitam" preload sizes="(min-width: 1024px) 52vw, 95vw" />
        <div className={styles.screen} style={{ left: `${retroGeometry.screen.left}%`, top: `${retroGeometry.screen.top}%`, width: `${retroGeometry.screen.width}%`, height: `${retroGeometry.screen.height}%` }}>
          <Image src="/landing/hero/booth-camera-sequence1.webp" fill alt="Dua orang tersenyum di preview kamera Poskart" sizes="(min-width: 1024px) 34vw, 60vw" className={styles.camera} />
          {[2, 3, 4].map(pose => (
            <div key={pose} data-retro-pose={pose} className={styles.capturePose}>
              <Image src={`/landing/hero/booth-camera-sequence${pose}.webp`} fill alt={`Pasangan berpose untuk foto ke-${pose}`} sizes="(min-width: 1024px) 34vw, 60vw" className={styles.camera} />
            </div>
          ))}
          <div className={styles.glass} />
          <div data-retro-flash className={styles.flash} />
        </div>
        <div className={styles.paperWindow} style={{ left: `${retroGeometry.slot.left}%`, top: `${retroGeometry.slot.top}%`, width: `${retroGeometry.slot.width}%` }}>
          <div data-retro-paper className={styles.paper}>
            <Image src="/landing/hero/photostrip.webp" width={539} height={1548} alt="Photostrip hitam putih dengan empat foto dan tekstur kertas thermal" sizes="(min-width: 1024px) 12vw, 27vw" />
          </div>
        </div>
        <div className={styles.slotLip} style={{ left: `${retroGeometry.slot.left}%`, top: `${retroGeometry.slot.top}%`, width: `${retroGeometry.slot.width}%` }} />
        <span data-retro-led className={styles.led} style={{ left: `${retroGeometry.slot.left}%`, top: `${retroGeometry.slot.top - 3}%` }}>● PRINTING</span>
      </div>
    </div>
  );
}
