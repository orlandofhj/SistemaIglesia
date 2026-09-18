package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;

@Entity
@Table(name = "nota_teologia")
public class NotaTeologia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idNotaTeologia;

    @ManyToOne
    @JoinColumn(name = "id_clase_teologia", nullable = false)
    private ClaseTeologia claseTeologia;

    // ⚡ VINCULAMOS LA NOTA DIRECTAMENTE A LA EVALUACIÓN (PLANIFICACIÓN) ⚡
    @ManyToOne
    @JoinColumn(name = "id_planificacion", nullable = false)
    private Planificacion planificacion;

    @ManyToOne
    @JoinColumn(name = "id_estudiante", nullable = false)
    private Persona estudiante;

    @Column(nullable = false)
    private Integer puntaje; 

    // --- GETTERS Y SETTERS ---
    public Integer getIdNotaTeologia() { return idNotaTeologia; }
    public void setIdNotaTeologia(Integer idNotaTeologia) { this.idNotaTeologia = idNotaTeologia; }

    public ClaseTeologia getClaseTeologia() { return claseTeologia; }
    public void setClaseTeologia(ClaseTeologia claseTeologia) { this.claseTeologia = claseTeologia; }

    public Planificacion getPlanificacion() { return planificacion; }
    public void setPlanificacion(Planificacion planificacion) { this.planificacion = planificacion; }

    public Persona getEstudiante() { return estudiante; }
    public void setEstudiante(Persona estudiante) { this.estudiante = estudiante; }

    public Integer getPuntaje() { return puntaje; }
    public void setPuntaje(Integer puntaje) { this.puntaje = puntaje; }
}