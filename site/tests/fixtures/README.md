# Recorded speech fixture

`voices-speech.wav` is an unchanged copy of
`Lab41-SRI-VOiCES-src-sp0307-ch127535-sg0042.wav`, from the
VOiCES (Voices Obscured in Complex Environmental Settings) dataset by Lab41 and SRI International.

- Source: https://download.pytorch.org/torchaudio/tutorial-assets/Lab41-SRI-VOiCES-src-sp0307-ch127535-sg0042.wav
- Dataset: https://iqtlabs.github.io/voices/
- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- PyTorch's [fixture documentation and license attribution](https://docs.pytorch.org/audio/main/tutorials/audio_feature_augmentation_tutorial.html)

Tests repeat the 3.4-second, mono 16 kHz recording, insert pauses, and reduce its gain.
These transformations happen in memory; the source recording is unchanged.
This one speaker is regression evidence, not population-level validation.
