package sylva.model;

import java.io.Serializable;
import sylva.model.Rules.TowerKind;

public final class Projectile implements Serializable {
    public final int id,towerId,targetId;public final TowerKind kind;public final double originX,originZ,targetX,targetZ,damage,speed,duration;public double x,y=1.15,z,age,vx,vy,vz;
    public Projectile(int id,TowerKind kind,int towerId,int targetId,double x,double z,double tx,double tz,double damage,double duration){this.id=id;this.kind=kind;this.towerId=towerId;this.targetId=targetId;this.x=x;this.z=z;originX=x;originZ=z;targetX=tx;targetZ=tz;this.damage=damage;this.duration=duration;speed=kind==TowerKind.FROST?8:15;}
}
