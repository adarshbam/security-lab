# Project design context

A local educational security laboratory with a calm, reading-focused interface. Reuse the light/dark reading palette in `src/client/styles/index.css`: warm neutrals and the existing green action accent. Use system typography, hairlines, generous section spacing and one 8px radius.

The curriculum uses a 1.25 type scale and the existing 4/8px spacing system. It is an ordered text list with progressive disclosure, prerequisite links and previous/next controls. No animation, progress score or new UI dependency is required. Existing global focus and reduced-motion styles apply.

Sources and constraints are recorded in `design.json`. The curriculum implementation is in `src/client/components/LearningPath.tsx` and its token stylesheet. Search inspiration: 21st numbered and vertical steppers; existing semantic project primitives were sufficient.
