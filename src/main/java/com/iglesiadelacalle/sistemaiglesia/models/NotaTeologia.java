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

    @ManyToOne
    @JoinColumn(name = "id_tema", nullable = false)
    private Tema tema;

    @ManyToOne
    @JoinColumn(name = "id_estudiante", nullable = false)
    private Persona estudiante;

    @Column(nullable = false)
    private Integer puntaje; // Valor del 0 al 20

    // --- GETTERS Y SETTERS ---
    public Integer getIdNotaTeologia() { return idNotaTeologia; }
    public void setIdNotaTeologia(Integer idNotaTeologia) { this.idNotaTeologia = idNotaTeologia; }

    public ClaseTeologia getClaseTeologia() { return claseTeologia; }
    public void setClaseTeologia(ClaseTeologia claseTeologia) { this.claseTeologia = claseTeologia; }

    public Tema getTema() { return tema; }
    public void setTema(Tema tema) { this.tema = tema; }

    public Persona getEstudiante() { return estudiante; }
    public void setEstudiante(Persona estudiante) { this.estudiante = estudiante; }

    public Integer getPuntaje() { return puntaje; }
    public void setPuntaje(Integer puntaje) { this.puntaje = puntaje; }
}