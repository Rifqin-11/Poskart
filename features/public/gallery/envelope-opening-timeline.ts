import gsap from "gsap";

type EnvelopeLayers = {
  seal: HTMLButtonElement;
  flap: HTMLDivElement;
  flapLayer: HTMLDivElement;
  rear: HTMLDivElement;
  pocket: HTMLDivElement;
  photo: HTMLDivElement;
};

export function createEnvelopeOpeningTimeline(layers: EnvelopeLayers, onComplete: () => void, reducedMotion = false) {
  const envelope = [layers.rear, layers.pocket, layers.flapLayer];
  const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete });

  if (reducedMotion) {
    return timeline
      .set(layers.photo, { opacity: 1 })
      .set([...envelope, layers.seal], { opacity: 0 });
  }

  return timeline
    .addLabel("breakSeal", 0)
    .to(layers.seal, { scale: .94, rotation: -3, opacity: 0, duration: .22, ease: "power2.out" }, "breakSeal")
    .addLabel("openFlap", "breakSeal+=.18")
    // The card is already inside. The flap and pocket physically occlude it;
    // no photo translation, scale, or cross-fade of differently shaped envelopes.
    .set(layers.photo, { opacity: 1 }, "openFlap")
    .to(layers.flap, { rotationX: -180, duration: 1.12 }, "openFlap")
    // At the edge-on midpoint the flap passes behind the stationary photograph.
    .set(layers.flapLayer, { zIndex: 1 }, "openFlap+=.56")
    .addLabel("photoInEnvelope", "openFlap+=1.12")
    .addLabel("envelopeDrops", "photoInEnvelope+=.65")
    .to(envelope, { yPercent: 70, duration: 1.1 }, "envelopeDrops")
    // Let the pocket visibly slide off the photo before fading the paper.
    .to(envelope, { opacity: 0, duration: .6, ease: "power1.in" }, "envelopeDrops+=.42");
}
