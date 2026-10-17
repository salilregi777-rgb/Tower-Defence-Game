package sylva.model;

import java.io.Serializable;
import sylva.model.Rules.EnemyKind;

public final class Invader implements Serializable {
    public final int id;public final EnemyKind kind;public final int maxHp,baseDamage;public double hp,speed,velocity,x,z,progress,angle,reward,slowUntil,slowFactor=1,hitAt=-10,seed;public boolean escaped;
    public Invader(int id,EnemyKind kind,int hp,double speed,int reward,int damage,double x,double z,double seed){this.id=id;this.kind=kind;this.maxHp=hp;this.hp=hp;this.speed=speed;this.reward=reward;this.baseDamage=damage;this.x=x;this.z=z;this.velocity=.15;this.angle=Math.PI/2;this.seed=seed;}
}
