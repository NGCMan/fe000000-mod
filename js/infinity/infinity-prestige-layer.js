let InfinityPrestigeLayer = {
  canInfinityBeBroken() {
    return Challenge.areAllChallengesCompleted();
  },
  isBreakInfinityOn() {
    // Don't credit the player with breaking infinity if they couldn't have done it.
    return this.canInfinityBeBroken() && player.breakInfinity;
  },
  isInfinityBroken() {
    return this.isBreakInfinityOn() && Challenge.isNoChallengeRunning() &&
      InfinityChallenge.isNoInfinityChallengeRunning();
  },
  breakInfinityButtonText() {
    return player.breakInfinity ?
      ('Fix infinity: force infinity at ' + format(Decimal.pow(2, 256)) + ' stars') :
      ('Break infinity: allow stars to go beyond ' + format(Decimal.pow(2, 256)) + ', with greater IP gain');
  },
  toggleBreakInfinity() {
    if (this.canInfinityBeBroken()) {
      player.breakInfinity = !player.breakInfinity;
    }
  },
  starRequirementForInfinity() {
    if (InfinityChallenge.isSomeInfinityChallengeRunning()) {
      return InfinityChallenge.getInfinityChallengeGoal(InfinityChallenge.currentInfinityChallenge());
    } else {
      return Decimal.pow(2, 256);
    }
  },
  canInfinity() {
    return this.bestStarsThisInfinity().gte(this.starRequirementForInfinity());
  },
  mustInfinity() {
    return this.canInfinity() && !this.isInfinityBroken();
  },
  isRequirementVisible() {
    return !this.canInfinity();
  },
  isAmountSpanVisible() {
    return this.isRequirementVisible() && PrestigeLayerProgress.hasReached('infinity');
  },
  bestStarsThisInfinity() {
    return player.stats.bestStarsThisInfinity;
  },
  infinityPointGain() {
    if (!this.canInfinity()) {
      return new Decimal(0);
    }
    let oom = (this.isInfinityBroken() ? this.bestStarsThisInfinity() : this.starRequirementForInfinity()).max(1).log(2) / 256;
    return Decimal.pow(2, oom).floor();
  },
  infinityPoints() {
    return InfinityPoints.amount();
  },
  newInfinityPoints() {
    return this.infinityPoints().plus(this.infinityPointGain());
  },
  totalInfinityPoints() {
    return InfinityPoints.totalIPProducedThisEternity();
  },
  newTotalInfinityPoints() {
    return this.totalInfinityPoints().plus(this.infinityPointGain());
  },
  infinityPointGainRatio() {
    return this.infinityPointGain().div(this.totalInfinityPoints());
  },
  infinityPointGainRatioText() {
    if (this.totalInfinityPoints().neq(0)) {
      return format(this.infinityPointGainRatio()) + 'x total, ';
    } else {
      return '';
    }
  },
  infinityPointNext() {
    return Decimal.pow(this.infinityPointGain().plus(1), 256);
  },
  infinityPointNextText() {
    if (this.infinityPointGain().lt(256)) {
      return ', next at ' + format(this.infinityPointNext()) + ' stars';
    } else {
      return '';
    }
  },
  currentIPPerSec() {
    // This Math.max is here to prevent issues with gain after 0 seconds from starting benefits.
    return this.infinityPointGain().div(Math.max(player.stats.timeSinceInfinity, 1 / 16));
  },
  currentLogIPPerSec() {
    let c = this.newTotalInfinityPoints().log2() - Math.max(this.totalInfinityPoints().log2(), 0);
    // Ignore very small gains.
    if (c < Math.pow(2, -16)) {
      c = 0;
    }
    return c / Math.max(player.stats.timeSinceInfinity, 1 / 16);
  },
  peakIPPerSec() {
    return player.stats.peakIPPerSec;
  },
  peakLogIPPerSec() {
    return player.stats.peakLogIPPerSec;
  },
  updatePeakIPPerSec() {
    let cps = this.currentIPPerSec();
    if (this.canInfinity() && cps.gt(player.stats.peakIPPerSec)) {
      player.stats.peakIPPerSec = cps;
      player.stats.timeSinceLastPeakIPPerSec = 0;
    }
  },
  updatePeakLogIPPerSec() {
    let cps = this.currentLogIPPerSec();
    if (this.canInfinity() && cps >= player.stats.peakLogIPPerSec) {
      player.stats.peakLogIPPerSec = cps;
      player.stats.timeSinceLastPeakLogIPPerSec = 0;
    }
  },
  showLog() {
    return Autobuyer(12).hasAutobuyer() && ['Time past peak log/sec', 'Fraction of peak log/sec'].includes(Autobuyer(12).mode());
  },
  compareIPGain() {
    if (this.infinityPointGain().lt(this.infinityPoints())) {
      player.stats.timeSinceIPGainWasAmount = 0;
    }
    if (this.infinityPointGain().lt(this.totalInfinityPoints())) {
      player.stats.timeSinceIPGainWasTotal = 0;
    }
  },
  infinityConfirmationMessage() {
    let gain = this.infinityPointGain();
    return 'Are you sure you want to infinity for ' +
    formatInt(gain) + ' infinity point' + pluralize(gain, '', 's') + '?';
  },
  infinityResetConfirmationMessage() {
    return 'Are you sure you want to do an infinity reset? This will not give you any infinity points.';
  },
  infinity(manual, newLimit) {
    if (!this.canInfinity()) return;
    if (manual && Options.confirmation('infinity') && !confirm(this.infinityConfirmationMessage())) return;
    if (EternityChallenge.isEternityChallengeRunning(4) &&
      EternityChallenge.eternityChallenge4RemainingInfinities() === 0) {
      EternityChallenge.exitEternityChallenge();
      return;
    }
    Achievements.checkForAchievements('infinity');
    let gain = this.infinityPointGain();
    InfinityPoints.addAmount(gain);
    Infinities.increment();
    ComplexityAchievements.checkForComplexityAchievements('infinity');
    Stats.addInfinity(player.stats.timeSinceInfinity, gain);
    Challenge.checkForChallengeCompletion();
    InfinityChallenge.checkForInfinityChallengeCompletion();
    if (!Challenge.restartOnCompletion()) {
      Challenge.setChallenge(0);
    }
    if (!InfinityChallenge.restartOnCompletion()) {
      InfinityChallenge.setInfinityChallenge(0);
    }
    Goals.recordPrestige('infinity');
    this.infinityReset(false, newLimit);
  },
  infinityReset(manual, newLimit) {
    if (manual && Options.confirmation('infinity') && !confirm(this.infinityResetConfirmationMessage())) return;
    Prestige.prestigeReset(true, newLimit);
    player.prestigePower = new Decimal(1);
    player.infinityStars = new Decimal(1);
    InfinityGenerators.list.forEach(x => x.resetAmount());
    player.stats.bestStarsThisInfinity = Stars.amount();
    player.stats.timeSinceInfinity = 0;
    player.stats.timeSinceLastPeakIPPerSec = Math.pow(2, 256);
    player.stats.timeSinceLastPeakLogIPPerSec = Math.pow(2, 256);
    player.stats.timeSinceIPGainWasAmount = 0;
    player.stats.timeSinceIPGainWasTotal = 0;
    player.stats.peakIPPerSec = new Decimal(0);
    player.stats.peakLogIPPerSec = 0;
    player.stats.purchasesThisInfinity = 0;
    player.stats.purchasesThisInfinityByType = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    player.stats.sacrificesThisInfinity = 0;
    player.stats.prestigesThisInfinity = 0;
  }
}
