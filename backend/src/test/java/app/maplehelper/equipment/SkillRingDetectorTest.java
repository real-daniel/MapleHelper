package app.maplehelper.equipment;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SkillRingDetectorTest {

    @Test
    void recognizesSpecialSkillRings() {
        assertThat(SkillRingDetector.isSkillRing("Ring of Restraint")).isTrue();
        assertThat(SkillRingDetector.isSkillRing("Weapon Jump S Ring")).isTrue();
        assertThat(SkillRingDetector.isSkillRing("Crisis HM Ring")).isTrue();
        assertThat(SkillRingDetector.isSkillRing("Very Fatal Rawr Ring")).isTrue();
        assertThat(SkillRingDetector.isSkillRingText("Usable Skill [Special Skill Ring] Ring of Restraint Lv. 5")).isTrue();
        assertThat(SkillRingDetector.findSkillRingName("Usable Skill [Special Skill Ring] Ring of Restraint Lv. 5"))
                .contains("Ring of Restraint");
    }

    @Test
    void doesNotTreatNormalRingsAsSkillRings() {
        assertThat(SkillRingDetector.isSkillRing("Guardian Angel Ring")).isFalse();
        assertThat(SkillRingDetector.isSkillRing("Kanna's Treasure")).isFalse();
    }
}
