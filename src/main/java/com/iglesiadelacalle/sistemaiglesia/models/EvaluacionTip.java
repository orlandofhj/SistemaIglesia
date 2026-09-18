package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;

@Entity
@Table(name = "evaluacion_tip")
public class EvaluacionTip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idEvaluacionTip;

    @ManyToOne
    @JoinColumn(name = "id_curso", nullable = false)
    private Curso curso;

    @ManyToOne
    @JoinColumn(name = "id_tip", nullable = false)
    private Tip tip;

    @ManyToOne
    @JoinColumn(name = "id_estudiante", nullable = false)
    private Persona estudiante;

    @Column(nullable = false)
    private Boolean aprobado; // true para Check (Aprobado), false para vacío (Reprobado)

    // --- GETTERS Y SETTERS ---

    public Integer getIdEvaluacionTip() {
        return idEvaluacionTip;
    }

    public void setIdEvaluacionTip(Integer idEvaluacionTip) {
        this.idEvaluacionTip = idEvaluacionTip;
    }

    public Curso getCurso() {
        return curso;
    }

    public void setCurso(Curso curso) {
        this.curso = curso;
    }

    public Tip getTip() {
        return tip;
    }

    public void setTip(Tip tip) {
        this.tip = tip;
    }

    public Persona getEstudiante() {
        return estudiante;
    }

    public void setEstudiante(Persona estudiante) {
        this.estudiante = estudiante;
    }

    public Boolean getAprobado() {
        return aprobado;
    }

    public void setAprobado(Boolean aprobado) {
        this.aprobado = aprobado;
    }
}