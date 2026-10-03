import { BriefLeadIn } from '../sections/BriefLeadIn';
import { Lab } from '../sections/Lab';
import { Process } from '../sections/Process';
import { Services } from '../sections/Services';
import { Story } from '../sections/Story';
import { Studio } from '../sections/Studio';
import { Work } from '../sections/Work';

/** Home: hero → idea-to-product story → Services → Work → Lab → Process → Studio → Brief. */
export function HomePage() {
  return (
    <>
      <Story />
      <Services />
      <Work />
      <Lab />
      <Process />
      <Studio />
      <BriefLeadIn />
    </>
  );
}
